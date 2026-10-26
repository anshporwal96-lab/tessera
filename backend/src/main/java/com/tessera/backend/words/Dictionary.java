package com.tessera.backend.words;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.Set;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/** Accepted daily guesses: the 5-letter dictionary plus every bank word of that length. */
@Component
public class Dictionary {

    private final Set<String> words = new HashSet<>();

    public Dictionary(WordBankSource bank) {
        ClassPathResource resource = new ClassPathResource("words/dict-5.txt");
        if (resource.exists()) {
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                reader.lines().map(String::trim).map(String::toUpperCase).filter(w -> !w.isEmpty()).forEach(words::add);
            } catch (IOException e) {
                throw new UncheckedIOException("Could not read dictionary", e);
            }
        }
        bank.entries().forEach(e -> words.add(e.word()));
    }

    public boolean isValid(String word) {
        return words.contains(word.toUpperCase());
    }
}
