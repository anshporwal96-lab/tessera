package com.tessera.backend.game;

import com.fasterxml.jackson.annotation.JsonValue;

public enum LetterState {
    CORRECT,
    PRESENT,
    ABSENT;

    @JsonValue
    public String json() {
        return name().toLowerCase();
    }
}
