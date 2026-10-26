package com.tessera.backend.words;

public class EmptyWordPoolException extends RuntimeException {

    public EmptyWordPoolException(int length) {
        super("No " + length + "-letter words are available in the word bank");
    }
}
