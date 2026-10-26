package com.tessera.backend.words;

import com.tessera.backend.game.Difficulty;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.UncheckedIOException;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

/**
 * The curated word bank, read from classpath:words/bank.csv. That file is
 * generated from the frontend (npm run export:bank) so both sides share one list.
 */
@Component
public class WordBankSource {

    public record Entry(String word, int length, Difficulty difficulty, int commonness, String category) {}

    private final List<Entry> entries;

    public WordBankSource() {
        this.entries = List.copyOf(parse(new ClassPathResource("words/bank.csv")));
    }

    public List<Entry> entries() {
        return entries;
    }

    static List<Entry> parse(ClassPathResource resource) {
        List<Entry> out = new ArrayList<>();
        if (!resource.exists()) return out;
        try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine(); // header
            while ((line = reader.readLine()) != null) {
                if (line.isBlank()) continue;
                String[] f = line.split(",", -1);
                if (f.length < 5) continue;
                String word = f[0].trim().toUpperCase();
                if (!word.matches("[A-Z]+") || word.length() != Integer.parseInt(f[1].trim())) continue;
                out.add(new Entry(word, word.length(), Difficulty.fromCode(f[2].trim()), Integer.parseInt(f[3].trim()), f[4].trim()));
            }
        } catch (IOException e) {
            throw new UncheckedIOException("Could not read word bank", e);
        }
        return out;
    }
}
