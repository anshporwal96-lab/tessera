package com.tessera.backend.daily;

import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class AttemptRepository {

    public record Attempt(String status, int guessCount) {}

    public record FinishedAttempt(LocalDate date, boolean won, int guessCount) {}

    private final JdbcClient jdbc;

    public AttemptRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    /** Creates the attempt if needed and locks it for the rest of the transaction. */
    public Attempt lockOrCreate(UUID playerId, LocalDate date) {
        jdbc.sql("""
                insert into daily_attempt (player_id, puzzle_date) values (:player, :date)
                on conflict do nothing
                """)
                .param("player", playerId)
                .param("date", date)
                .update();
        return jdbc.sql("""
                select status, guess_count from daily_attempt
                 where player_id = :player and puzzle_date = :date
                 for update
                """)
                .param("player", playerId)
                .param("date", date)
                .query(Attempt.class)
                .single();
    }

    public void addGuess(UUID playerId, LocalDate date, int attemptNo, String guess, String status) {
        jdbc.sql("""
                insert into daily_guess (player_id, puzzle_date, attempt_no, guess)
                values (:player, :date, :no, :guess)
                """)
                .param("player", playerId)
                .param("date", date)
                .param("no", attemptNo)
                .param("guess", guess)
                .update();
        jdbc.sql("""
                update daily_attempt
                   set guess_count = :no, status = :status,
                       completed_at = case when :status = 'playing' then null else now() end
                 where player_id = :player and puzzle_date = :date
                """)
                .param("player", playerId)
                .param("date", date)
                .param("no", attemptNo)
                .param("status", status)
                .update();
    }

    public List<String> guesses(UUID playerId, LocalDate date) {
        return jdbc.sql("""
                select guess from daily_guess
                 where player_id = :player and puzzle_date = :date
                 order by attempt_no
                """)
                .param("player", playerId)
                .param("date", date)
                .query(String.class)
                .list();
    }

    public String status(UUID playerId, LocalDate date) {
        return jdbc.sql("select status from daily_attempt where player_id = :player and puzzle_date = :date")
                .param("player", playerId)
                .param("date", date)
                .query(String.class)
                .optional()
                .orElse("playing");
    }

    public List<FinishedAttempt> finished(UUID playerId) {
        return jdbc.sql("""
                select puzzle_date, status, guess_count from daily_attempt
                 where player_id = :player and status <> 'playing'
                 order by puzzle_date
                """)
                .param("player", playerId)
                .query((rs, n) -> new FinishedAttempt(
                        rs.getObject("puzzle_date", LocalDate.class),
                        "won".equals(rs.getString("status")),
                        rs.getInt("guess_count")))
                .list();
    }

    /** Aggregate results for a date, for community stats. */
    public List<FinishedAttempt> finishedOn(LocalDate date) {
        return jdbc.sql("""
                select puzzle_date, status, guess_count from daily_attempt
                 where puzzle_date = :date and status <> 'playing'
                """)
                .param("date", date)
                .query((rs, n) -> new FinishedAttempt(
                        rs.getObject("puzzle_date", LocalDate.class),
                        "won".equals(rs.getString("status")),
                        rs.getInt("guess_count")))
                .list();
    }
}
