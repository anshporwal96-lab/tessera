package com.tessera.backend;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tessera.backend.daily.DailyScheduleService;
import com.tessera.backend.support.MutableClock;
import com.tessera.backend.support.TestDatabaseConfig;
import java.time.Instant;
import java.time.LocalDate;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;

// Every request here comes from one IP; rate limiting has its own test class.
@SpringBootTest(properties = "tessera.rate-limit.enabled=false")
@AutoConfigureMockMvc
@Import(TestDatabaseConfig.class)
class DailyApiIntegrationTest {

    private static final String TODAY = "2026-10-27";
    /** Valid dictionary words that are never 5-letter daily answers… unless the test checks first. */
    private static final List<String> FILLERS = List.of("ABOUT", "OTHER", "WHICH", "THEIR", "THERE", "FIRST", "WOULD", "THESE");

    @Autowired MockMvc mvc;
    @Autowired ObjectMapper json;
    @Autowired JdbcClient jdbc;
    @Autowired MutableClock clock;
    @Autowired DailyScheduleService schedule;

    @BeforeEach
    void reset() {
        clock.set(Instant.parse("2026-10-27T12:00:00Z"));
        jdbc.sql("truncate daily_guess, daily_attempt, daily_puzzle, player").update();
    }

    private String register() throws Exception {
        String body = mvc.perform(post("/api/players"))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body).get("token").asText();
    }

    private ResultActions guess(String token, String date, String guess) throws Exception {
        return mvc.perform(post("/api/daily/" + date + "/guesses")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"guess\":\"" + guess + "\"}"));
    }

    private JsonNode today(String token) throws Exception {
        String body = mvc.perform(get("/api/daily/today").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        return json.readTree(body);
    }

    private String answerFor(String date) {
        return jdbc.sql("select w.word from daily_puzzle p join word w on w.id = p.word_id where p.puzzle_date = :d")
                .param("d", LocalDate.parse(date))
                .query(String.class)
                .single();
    }

    private List<String> wrongGuesses(String answer, int n) {
        return FILLERS.stream().filter(w -> !w.equals(answer)).limit(n).toList();
    }

    @Test
    void requiresAPlayerToken() throws Exception {
        mvc.perform(get("/api/daily/today")).andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.error").value("unauthorized"));
        mvc.perform(get("/api/daily/today").header("Authorization", "Bearer made-up")).andExpect(status().isUnauthorized());
    }

    @Test
    void neverRevealsTheAnswerBeforeTheGameIsOver() throws Exception {
        String token = register();
        JsonNode state = today(token);
        assertThat(state.get("dateKey").asText()).isEqualTo(TODAY);
        assertThat(state.get("difficulty").asText()).isEqualTo("easy");
        assertThat(state.get("status").asText()).isEqualTo("playing");
        assertThat(state.has("answer")).isFalse();

        String answer = answerFor(TODAY);
        String response = guess(token, TODAY, wrongGuesses(answer, 1).get(0))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.gameOver").value(false))
                .andReturn().getResponse().getContentAsString();
        assertThat(response).doesNotContain(answer).doesNotContain("answer");
        assertThat(today(token).toString()).doesNotContain(answer);
    }

    @Test
    void sameAnswerForEveryPlayerAndStableAcrossRequests() throws Exception {
        String a = register();
        String b = register();
        today(a);
        String answer = answerFor(TODAY);
        today(b);
        assertThat(answerFor(TODAY)).isEqualTo(answer);
        guess(a, TODAY, answer).andExpect(jsonPath("$.answer").value(answer));
        guess(b, TODAY, answer).andExpect(jsonPath("$.answer").value(answer));
    }

    @Test
    void winningSavesProgressAndLocksTheDay() throws Exception {
        String token = register();
        today(token);
        String answer = answerFor(TODAY);
        String wrong = wrongGuesses(answer, 1).get(0);

        guess(token, TODAY, wrong).andExpect(status().isOk()).andExpect(jsonPath("$.attempt").value(1));
        // "Refresh": progress comes back from the server.
        JsonNode resumed = today(token);
        assertThat(resumed.get("guesses").get(0).asText()).isEqualTo(wrong);
        assertThat(resumed.get("evaluations").get(0)).hasSize(5);

        guess(token, TODAY, answer.toLowerCase())
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.solved").value(true))
                .andExpect(jsonPath("$.gameOver").value(true))
                .andExpect(jsonPath("$.attempt").value(2))
                .andExpect(jsonPath("$.answer").value(answer));

        JsonNode done = today(token);
        assertThat(done.get("status").asText()).isEqualTo("won");
        assertThat(done.get("answer").asText()).isEqualTo(answer);

        // One official attempt per day.
        guess(token, TODAY, wrong).andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("game-over"));
    }

    @Test
    void losingOnTheSixthGuessRevealsTheAnswer() throws Exception {
        String token = register();
        today(token);
        String answer = answerFor(TODAY);
        List<String> wrong = wrongGuesses(answer, 6);
        for (int i = 0; i < 5; i++) {
            guess(token, TODAY, wrong.get(i)).andExpect(jsonPath("$.gameOver").value(false));
        }
        guess(token, TODAY, wrong.get(5))
                .andExpect(jsonPath("$.gameOver").value(true))
                .andExpect(jsonPath("$.solved").value(false))
                .andExpect(jsonPath("$.answer").value(answer));
        assertThat(today(token).get("status").asText()).isEqualTo("lost");
    }

    @Test
    void winningOnTheFinalAttempt() throws Exception {
        String token = register();
        today(token);
        String answer = answerFor(TODAY);
        for (String w : wrongGuesses(answer, 5)) guess(token, TODAY, w);
        guess(token, TODAY, answer).andExpect(jsonPath("$.solved").value(true)).andExpect(jsonPath("$.attempt").value(6));
    }

    @Test
    void rejectsInvalidGuessesWithoutUsingAnAttempt() throws Exception {
        String token = register();
        guess(token, TODAY, "QZXJK").andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("invalid-word"));
        guess(token, TODAY, "CRAN").andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("incomplete"));
        guess(token, TODAY, "CR4NE").andExpect(status().isBadRequest()).andExpect(jsonPath("$.error").value("invalid-format"));
        guess(token, "not-a-date", "CRANE").andExpect(status().isBadRequest());
        assertThat(today(token).get("guesses")).isEmpty();
    }

    @Test
    void puzzleRollsOverAtUtcMidnight() throws Exception {
        String token = register();
        today(token);
        String tuesday = answerFor(TODAY);

        clock.set(Instant.parse("2026-10-27T23:59:59Z"));
        assertThat(today(token).get("dateKey").asText()).isEqualTo(TODAY);

        clock.set(Instant.parse("2026-10-28T00:00:00Z"));
        JsonNode wednesday = today(token);
        assertThat(wednesday.get("dateKey").asText()).isEqualTo("2026-10-28");
        assertThat(wednesday.get("difficulty").asText()).isEqualTo("medium");
        assertThat(wednesday.get("guesses")).isEmpty();
        assertThat(answerFor("2026-10-28")).isNotEqualTo(tuesday);

        // A guess for yesterday's puzzle sent after midnight is refused.
        guess(token, TODAY, "CRANE").andExpect(status().isConflict()).andExpect(jsonPath("$.error").value("not-today"));
    }

    @Test
    void weekendPuzzlesComeFromHarderPools() throws Exception {
        String token = register();
        clock.set(Instant.parse("2026-10-31T09:00:00Z")); // Saturday
        assertThat(today(token).get("difficulty").asText()).isEqualTo("hard");
        assertThat(tierOf(answerFor("2026-10-31"))).isEqualTo("hard");

        clock.set(Instant.parse("2026-11-01T09:00:00Z")); // Sunday
        assertThat(today(token).get("difficulty").asText()).isEqualTo("veryhard");
        assertThat(tierOf(answerFor("2026-11-01"))).isEqualTo("veryhard");
        assertThat(answerFor("2026-11-01")).hasSize(5);
    }

    private String tierOf(String word) {
        return jdbc.sql("select difficulty from word where word = :w").param("w", word).query(String.class).single();
    }

    @Test
    void doesNotRepeatAWordUntilThePoolIsUsedUp() {
        int easyPool = jdbc.sql("select count(*) from word where length = 5 and difficulty = 'easy'").query(Integer.class).single();
        Set<String> seen = new HashSet<>();
        LocalDate day = LocalDate.of(2026, 10, 26); // Monday
        int easyDays = 0;
        while (easyDays < easyPool) {
            if (com.tessera.backend.game.Difficulty.forDate(day) == com.tessera.backend.game.Difficulty.EASY) {
                assertThat(seen.add(schedule.puzzleFor(day).answer())).as("repeat on %s", day).isTrue();
                easyDays++;
            }
            day = day.plusDays(1);
        }
    }

    @Test
    void storedPuzzlesNeverChange() {
        LocalDate date = LocalDate.of(2026, 10, 29);
        String first = schedule.puzzleFor(date).answer();
        for (int i = 0; i < 5; i++) assertThat(schedule.puzzleFor(date).answer()).isEqualTo(first);
    }

    @Test
    void statsFollowStreakRules() throws Exception {
        String token = register();
        // Win Tue, win Wed, lose Thu, win Fri.
        String[] days = {"2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30"};
        boolean[] win = {true, true, false, true};
        for (int i = 0; i < days.length; i++) {
            clock.set(Instant.parse(days[i] + "T10:00:00Z"));
            today(token);
            String answer = answerFor(days[i]);
            if (win[i]) {
                guess(token, days[i], answer);
            } else {
                for (String w : wrongGuesses(answer, 6)) guess(token, days[i], w);
            }
        }
        mvc.perform(get("/api/players/me/stats").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.played").value(4))
                .andExpect(jsonPath("$.wins").value(3))
                .andExpect(jsonPath("$.currentStreak").value(1))
                .andExpect(jsonPath("$.maxStreak").value(2))
                .andExpect(jsonPath("$.distribution[0]").value(3))
                .andExpect(jsonPath("$.lastWinDate").value("2026-10-30"));
    }

    @Test
    void communitySummaryIsSpoilerFree() throws Exception {
        String a = register();
        String b = register();
        today(a);
        String answer = answerFor(TODAY);
        guess(a, TODAY, answer);
        for (String w : wrongGuesses(answer, 6)) guess(b, TODAY, w);

        String body = mvc.perform(get("/api/daily/" + TODAY + "/summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.players").value(2))
                .andExpect(jsonPath("$.solved").value(1))
                .andExpect(jsonPath("$.distribution[0]").value(1))
                .andReturn().getResponse().getContentAsString();
        assertThat(body).doesNotContain(answer);
        mvc.perform(get("/api/daily/2026-12-25/summary")).andExpect(status().isNotFound());
    }
}
