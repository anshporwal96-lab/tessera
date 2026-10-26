package com.tessera.backend.game;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDate;
import java.util.stream.Collectors;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.api.Test;

/** Mirrors src/engine/evaluate.test.ts so client and server can never disagree. */
class GuessEvaluatorTest {

    private static String shorthand(String guess, String answer) {
        return GuessEvaluator.evaluate(guess, answer).stream()
                .map(s -> switch (s) {
                    case CORRECT -> "G";
                    case PRESENT -> "Y";
                    case ABSENT -> "-";
                })
                .collect(Collectors.joining());
    }

    @ParameterizedTest(name = "{0} vs {1} = {2}")
    @CsvSource({
        "CRANE, CRANE, GGGGG",
        "PUDGY, CRANE, -----",
        "NACRE, CRANE, YYYYG",
        "EERIE, CRANE, --Y-G",
        "LLAMA, HELLO, YY---",
        "HOTEL, HELLO, GY-YY",
        "BABBY, ABBEY, YYG-G",
        "SPEED, ABIDE, --Y-Y",
        "ERASE, SPEED, Y--YY",
        "EERIE, SPEED, YY---",
        "KNACK, KAYAK, G-Y-G",
        "BEAR,  BEAD,  GGG-",
        "PLANET, PENCIL, GY-YY-",
    })
    void scoresLikeTheFrontend(String guess, String answer, String expected) {
        assertThat(shorthand(guess, answer)).isEqualTo(expected);
    }

    @Test
    void solvedOnlyWhenAllCorrect() {
        assertThat(GuessEvaluator.isSolved(GuessEvaluator.evaluate("crane", "CRANE"))).isTrue();
        assertThat(GuessEvaluator.isSolved(GuessEvaluator.evaluate("NACRE", "CRANE"))).isFalse();
    }

    @Test
    void rejectsLengthMismatch() {
        assertThatThrownBy(() -> GuessEvaluator.evaluate("CAT", "CRANE")).isInstanceOf(IllegalArgumentException.class);
    }

    @Test
    void weekdayScheduleMatchesFrontend() {
        // 2026-10-26 is a Monday.
        LocalDate monday = LocalDate.of(2026, 10, 26);
        assertThat(java.util.stream.IntStream.range(0, 7).mapToObj(i -> Difficulty.forDate(monday.plusDays(i))))
                .containsExactly(Difficulty.EASY, Difficulty.EASY, Difficulty.MEDIUM, Difficulty.EASY,
                        Difficulty.MEDIUM, Difficulty.HARD, Difficulty.VERYHARD);
    }
}
