package com.tessera.backend.game;

import com.fasterxml.jackson.annotation.JsonValue;
import java.time.DayOfWeek;
import java.time.LocalDate;
import java.util.List;

public enum Difficulty {
    EASY,
    MEDIUM,
    HARD,
    VERYHARD;

    @JsonValue
    public String code() {
        return name().toLowerCase();
    }

    public static Difficulty fromCode(String code) {
        return valueOf(code.toUpperCase());
    }

    /** Weekday schedule — must match WEEKLY_SCHEDULE in the frontend's engine/daily.ts. */
    public static Difficulty forDate(LocalDate date) {
        DayOfWeek day = date.getDayOfWeek();
        return switch (day) {
            case MONDAY, TUESDAY, THURSDAY -> EASY;
            case WEDNESDAY, FRIDAY -> MEDIUM;
            case SATURDAY -> HARD;
            case SUNDAY -> VERYHARD;
        };
    }

    /** Tiers to try, in order, if this tier's pool is empty. */
    public List<Difficulty> fallbackOrder() {
        return switch (this) {
            case EASY -> List.of(EASY, MEDIUM, HARD, VERYHARD);
            case MEDIUM -> List.of(MEDIUM, EASY, HARD, VERYHARD);
            case HARD -> List.of(HARD, VERYHARD, MEDIUM, EASY);
            case VERYHARD -> List.of(VERYHARD, HARD, MEDIUM, EASY);
        };
    }
}
