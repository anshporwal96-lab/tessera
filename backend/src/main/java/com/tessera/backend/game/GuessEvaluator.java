package com.tessera.backend.game;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Same two-pass algorithm as the frontend's engine/evaluate.ts. */
public final class GuessEvaluator {

    private GuessEvaluator() {}

    public static List<LetterState> evaluate(String guess, String answer) {
        String g = guess.toUpperCase();
        String a = answer.toUpperCase();
        if (g.length() != a.length()) {
            throw new IllegalArgumentException("Guess length does not match answer length");
        }

        List<LetterState> result = new ArrayList<>(Collections.nCopies(g.length(), LetterState.ABSENT));
        Map<Character, Integer> unmatched = new HashMap<>();

        // Pass 1: exact matches; remember answer letters not yet matched.
        for (int i = 0; i < a.length(); i++) {
            if (g.charAt(i) == a.charAt(i)) {
                result.set(i, LetterState.CORRECT);
            } else {
                unmatched.merge(a.charAt(i), 1, Integer::sum);
            }
        }
        // Pass 2: misplaced letters, never more than remain unmatched.
        for (int i = 0; i < g.length(); i++) {
            if (result.get(i) == LetterState.CORRECT) continue;
            int left = unmatched.getOrDefault(g.charAt(i), 0);
            if (left > 0) {
                result.set(i, LetterState.PRESENT);
                unmatched.put(g.charAt(i), left - 1);
            }
        }
        return result;
    }

    public static boolean isSolved(List<LetterState> evaluation) {
        return !evaluation.isEmpty() && evaluation.stream().allMatch(s -> s == LetterState.CORRECT);
    }
}
