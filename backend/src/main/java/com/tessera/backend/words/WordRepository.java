package com.tessera.backend.words;

import com.tessera.backend.game.Difficulty;
import java.util.List;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.namedparam.SqlParameterSource;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public class WordRepository {

    public record WordRow(long id, String word, String category) {}

    private final JdbcClient jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    public WordRepository(JdbcClient jdbc, NamedParameterJdbcTemplate namedJdbc) {
        this.jdbc = jdbc;
        this.namedJdbc = namedJdbc;
    }

    /**
     * Inserts new words and refreshes metadata of existing ones, as one JDBC
     * batch in a single transaction. Never deletes, so past puzzles stay valid.
     */
    @Transactional
    public void upsertAll(List<WordBankSource.Entry> entries) {
        SqlParameterSource[] batch = entries.stream()
                .map(e -> new MapSqlParameterSource()
                        .addValue("word", e.word())
                        .addValue("length", e.length())
                        .addValue("difficulty", e.difficulty().code())
                        .addValue("commonness", e.commonness())
                        .addValue("category", e.category()))
                .toArray(SqlParameterSource[]::new);
        namedJdbc.batchUpdate("""
                insert into word (word, length, difficulty, commonness, category)
                values (:word, :length, :difficulty, :commonness, :category)
                on conflict (word) do update
                   set length = excluded.length, difficulty = excluded.difficulty,
                       commonness = excluded.commonness, category = excluded.category, active = true
                """, batch);
    }

    public List<WordRow> findPool(int length, Difficulty difficulty) {
        return jdbc.sql("""
                select id, word, category from word
                 where active and length = :length and difficulty = :difficulty
                 order by word
                """)
                .param("length", length)
                .param("difficulty", difficulty.code())
                .query(WordRow.class)
                .list();
    }
}
