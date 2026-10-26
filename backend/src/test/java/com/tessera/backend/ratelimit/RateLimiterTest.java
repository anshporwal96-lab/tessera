package com.tessera.backend.ratelimit;

import static org.assertj.core.api.Assertions.assertThat;

import com.tessera.backend.config.TesseraProperties.RateLimit;
import com.tessera.backend.config.TesseraProperties.RateLimit.Rule;
import com.tessera.backend.ratelimit.RateLimiter.Kind;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicLong;
import org.junit.jupiter.api.Test;

class RateLimiterTest {

    private final AtomicLong now = new AtomicLong(1_000_000_000L);

    private RateLimiter limiter(int maxClients) {
        // register: burst 3, 1/min · guess: burst 2, 60/min · read: burst 5, 60/min
        RateLimit config = new RateLimit(true, maxClients, new Rule(3, 1), new Rule(2, 60), new Rule(5, 60));
        return new RateLimiter(config, now::get);
    }

    private void advance(long amount, TimeUnit unit) {
        now.addAndGet(unit.toNanos(amount));
    }

    @Test
    void allowsTheBurstThenAsksTheClientToWait() {
        RateLimiter limiter = limiter(1000);
        for (int i = 0; i < 3; i++) assertThat(limiter.check(Kind.REGISTER, "1.2.3.4")).isZero();
        // Refill is 1 per minute, so the next token is 60 s away.
        assertThat(limiter.check(Kind.REGISTER, "1.2.3.4")).isEqualTo(60);
    }

    @Test
    void refillsOverTime() {
        RateLimiter limiter = limiter(1000);
        limiter.check(Kind.GUESS, "a");
        limiter.check(Kind.GUESS, "a");
        assertThat(limiter.check(Kind.GUESS, "a")).isEqualTo(1);
        advance(1, TimeUnit.SECONDS);
        assertThat(limiter.check(Kind.GUESS, "a")).isZero();
    }

    @Test
    void keepsClientsAndKindsSeparate() {
        RateLimiter limiter = limiter(1000);
        for (int i = 0; i < 3; i++) limiter.check(Kind.REGISTER, "a");
        assertThat(limiter.check(Kind.REGISTER, "a")).isPositive();
        assertThat(limiter.check(Kind.REGISTER, "b")).isZero();
        assertThat(limiter.check(Kind.READ, "a")).isZero();
    }

    @Test
    void forgetsIdleClientsSoMemoryStaysBounded() {
        RateLimiter limiter = limiter(2);
        limiter.check(Kind.READ, "a");
        limiter.check(Kind.READ, "b");
        advance(11, TimeUnit.MINUTES); // both buckets full again and idle
        limiter.check(Kind.READ, "c"); // over maxClients → idle buckets evicted
        assertThat(limiter.trackedClients()).isEqualTo(1);
    }
}
