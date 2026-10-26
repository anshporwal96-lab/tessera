package com.tessera.backend.ratelimit;

import com.tessera.backend.config.TesseraProperties;
import com.tessera.backend.config.TesseraProperties.RateLimit.Rule;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.TimeUnit;
import java.util.function.LongSupplier;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * In-memory per-client rate limiter. Suitable for a single API instance; with
 * several instances, put a shared limit in front (the bundled nginx config adds
 * one) or move the buckets to a shared store such as Redis.
 */
@Component
public class RateLimiter {

    public enum Kind { REGISTER, GUESS, READ }

    private static final long IDLE_NANOS = TimeUnit.MINUTES.toNanos(10);

    private final TesseraProperties.RateLimit config;
    private final LongSupplier nanoClock;
    private final Map<String, TokenBucket> buckets = new ConcurrentHashMap<>();

    @Autowired
    public RateLimiter(TesseraProperties properties) {
        this(properties.rateLimit(), System::nanoTime);
    }

    RateLimiter(TesseraProperties.RateLimit config, LongSupplier nanoClock) {
        this.config = config;
        this.nanoClock = nanoClock;
    }

    public boolean enabled() {
        return config.enabled();
    }

    /** @return 0 if allowed, otherwise whole seconds the client should wait. */
    public long check(Kind kind, String clientKey) {
        Rule rule = switch (kind) {
            case REGISTER -> config.register();
            case GUESS -> config.guess();
            case READ -> config.read();
        };
        long now = nanoClock.getAsLong();
        if (buckets.size() >= config.maxClients()) evictIdle(now);
        TokenBucket bucket = buckets.computeIfAbsent(kind + "|" + clientKey,
                k -> new TokenBucket(rule.capacity(), rule.refillPerMinute() / 60d, now));
        long waitNanos = bucket.tryConsume(now);
        return waitNanos == 0 ? 0 : Math.max(1, TimeUnit.NANOSECONDS.toSeconds(waitNanos + 999_999_999));
    }

    @Scheduled(fixedDelay = 5, timeUnit = TimeUnit.MINUTES)
    void evictIdle() {
        evictIdle(nanoClock.getAsLong());
    }

    private void evictIdle(long now) {
        buckets.values().removeIf(b -> b.isIdle(now, IDLE_NANOS));
    }

    int trackedClients() {
        return buckets.size();
    }
}
