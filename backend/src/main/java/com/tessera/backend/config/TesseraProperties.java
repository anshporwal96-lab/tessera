package com.tessera.backend.config;

import java.time.LocalDate;
import java.util.List;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties("tessera")
public record TesseraProperties(List<String> corsOrigins, Daily daily, RateLimit rateLimit) {

    public record Daily(LocalDate epoch, int wordLength, int maxGuesses, int pregenerateDays, int recentGapDays) {}

    /** Per-client-IP token buckets. `capacity` = burst size, `refillPerMinute` = sustained rate. */
    public record RateLimit(boolean enabled, int maxClients, Rule register, Rule guess, Rule read) {

        public record Rule(int capacity, double refillPerMinute) {}
    }
}
