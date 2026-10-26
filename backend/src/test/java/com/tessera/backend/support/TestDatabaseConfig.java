package com.tessera.backend.support;

import com.zaxxer.hikari.HikariDataSource;
import io.zonky.test.db.postgres.embedded.EmbeddedPostgres;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.nio.file.Path;
import java.time.Instant;
import org.springframework.boot.test.context.TestConfiguration;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Primary;

/**
 * Tests run against a real PostgreSQL started from bundled binaries — the same
 * engine and Flyway migrations as production, with no local server or Docker.
 */
@TestConfiguration(proxyBeanMethods = false)
public class TestDatabaseConfig {

    private static final EmbeddedPostgres POSTGRES = start();

    private static EmbeddedPostgres start() {
        try {
            // initdb takes ~20 s on Windows, so the cluster is kept in target/ and
            // reused by later runs (`mvn clean` starts afresh). Tests truncate their
            // own tables and Flyway applies any new migrations on start.
            // Disk syncs are pointless for a throwaway database.
            return EmbeddedPostgres.builder()
                    .setDataDirectory(Path.of("target", "embedded-pg"))
                    .setCleanDataDirectory(false)
                    .setServerConfig("fsync", "off")
                    .setServerConfig("synchronous_commit", "off")
                    .setServerConfig("full_page_writes", "off")
                    .start();
        } catch (IOException e) {
            throw new UncheckedIOException("Could not start embedded PostgreSQL", e);
        }
    }

    /**
     * Pooled like production. The raw embedded DataSource opens a new
     * PostgreSQL backend per query, which costs ~100 ms each on Windows.
     */
    @Bean(destroyMethod = "close")
    @Primary
    public HikariDataSource testDataSource() {
        HikariDataSource pool = new HikariDataSource();
        pool.setDataSource(POSTGRES.getPostgresDatabase());
        pool.setMaximumPoolSize(4);
        return pool;
    }

    /** Tuesday 2026-10-27, 12:00 UTC. */
    @Bean
    @Primary
    public MutableClock testClock() {
        return new MutableClock(Instant.parse("2026-10-27T12:00:00Z"));
    }
}
