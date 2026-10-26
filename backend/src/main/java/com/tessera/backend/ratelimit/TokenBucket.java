package com.tessera.backend.ratelimit;

/**
 * Classic token bucket: holds up to {@code capacity} tokens, refilled
 * continuously at {@code refillPerSecond}. Each request takes one token.
 */
final class TokenBucket {

    private final double capacity;
    private final double refillPerNano;
    private double tokens;
    private long lastRefill;
    private long lastUsed;

    TokenBucket(double capacity, double refillPerSecond, long nowNanos) {
        this.capacity = capacity;
        this.refillPerNano = refillPerSecond / 1_000_000_000d;
        this.tokens = capacity;
        this.lastRefill = nowNanos;
        this.lastUsed = nowNanos;
    }

    /** @return 0 if a token was taken, otherwise the nanoseconds until one is available. */
    synchronized long tryConsume(long nowNanos) {
        refill(nowNanos);
        lastUsed = nowNanos;
        if (tokens >= 1) {
            tokens -= 1;
            return 0;
        }
        return (long) Math.ceil((1 - tokens) / refillPerNano);
    }

    /** True once the bucket is full again and unused for {@code idleNanos} — safe to forget. */
    synchronized boolean isIdle(long nowNanos, long idleNanos) {
        refill(nowNanos);
        return tokens >= capacity && nowNanos - lastUsed >= idleNanos;
    }

    private void refill(long nowNanos) {
        long elapsed = nowNanos - lastRefill;
        if (elapsed > 0) {
            tokens = Math.min(capacity, tokens + elapsed * refillPerNano);
            lastRefill = nowNanos;
        }
    }
}
