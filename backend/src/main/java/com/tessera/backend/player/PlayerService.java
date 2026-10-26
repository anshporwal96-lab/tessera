package com.tessera.backend.player;

import com.tessera.backend.web.ApiException;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.util.Base64;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Service;

/**
 * Anonymous players. The client receives a random bearer token once; the
 * server keeps only its SHA-256 hash, so a database leak exposes no tokens.
 */
@Service
public class PlayerService {

    public record NewPlayer(UUID playerId, String token) {}

    private static final SecureRandom RANDOM = new SecureRandom();

    private final JdbcClient jdbc;

    public PlayerService(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    public NewPlayer register() {
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        UUID id = UUID.randomUUID();
        jdbc.sql("insert into player (id, token_hash) values (:id, :hash)")
                .param("id", id)
                .param("hash", hash(token))
                .update();
        return new NewPlayer(id, token);
    }

    /** Resolves an "Authorization: Bearer …" header to a player id, or throws 401. */
    public UUID requirePlayer(String authorization) {
        if (authorization == null || !authorization.startsWith("Bearer ")) throw ApiException.unauthorized();
        String token = authorization.substring("Bearer ".length()).trim();
        if (token.isEmpty() || token.length() > 128) throw ApiException.unauthorized();
        Optional<UUID> id = jdbc.sql("""
                update player set last_seen_at = now() where token_hash = :hash returning id
                """)
                .param("hash", hash(token))
                .query(UUID.class)
                .optional();
        return id.orElseThrow(ApiException::unauthorized);
    }

    static String hash(String token) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256").digest(token.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException(e);
        }
    }
}
