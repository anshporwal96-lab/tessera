package com.tessera.backend.support;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;
import java.time.ZoneOffset;

/** A UTC clock tests can move, e.g. across midnight. */
public class MutableClock extends Clock {

    private volatile Instant now;

    public MutableClock(Instant start) {
        this.now = start;
    }

    public void set(Instant instant) {
        this.now = instant;
    }

    @Override
    public ZoneId getZone() {
        return ZoneOffset.UTC;
    }

    @Override
    public Clock withZone(ZoneId zone) {
        return this;
    }

    @Override
    public Instant instant() {
        return now;
    }
}
