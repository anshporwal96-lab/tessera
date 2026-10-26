package com.tessera.backend.daily;

import com.tessera.backend.game.Difficulty;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.Map;
import java.util.Optional;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
public class DailyPuzzleRepository {

    /** A stored puzzle. Contains the answer — never serialise this directly to clients. */
    public record Puzzle(LocalDate date, int puzzleNumber, Difficulty difficulty, String answer, String category) {}

    private final JdbcClient jdbc;

    public DailyPuzzleRepository(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public Optional<Puzzle> find(LocalDate date) {
        return jdbc.sql("""
                select p.puzzle_date, p.puzzle_number, p.difficulty, w.word, w.category
                  from daily_puzzle p join word w on w.id = p.word_id
                 where p.puzzle_date = :date
                """)
                .param("date", date)
                .query((rs, n) -> new Puzzle(
                        rs.getObject("puzzle_date", LocalDate.class),
                        rs.getInt("puzzle_number"),
                        Difficulty.fromCode(rs.getString("difficulty")),
                        rs.getString("word"),
                        rs.getString("category")))
                .optional();
    }

    /** Insert unless another request already assigned this date; the first writer wins. */
    public void insertIfAbsent(LocalDate date, int puzzleNumber, Difficulty difficulty, long wordId) {
        jdbc.sql("""
                insert into daily_puzzle (puzzle_date, puzzle_number, difficulty, word_id)
                values (:date, :number, :difficulty, :wordId)
                on conflict do nothing
                """)
                .param("date", date)
                .param("number", puzzleNumber)
                .param("difficulty", difficulty.code())
                .param("wordId", wordId)
                .update();
    }

    /** Most recent date each word was used as a daily answer. */
    public Map<Long, LocalDate> lastUsedDates() {
        Map<Long, LocalDate> out = new HashMap<>();
        jdbc.sql("select word_id, max(puzzle_date) as last_used from daily_puzzle group by word_id")
                .query(rs -> {
                    out.put(rs.getLong("word_id"), rs.getObject("last_used", LocalDate.class));
                });
        return out;
    }
}
