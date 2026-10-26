package com.tessera.backend.daily;

import com.tessera.backend.config.TesseraProperties;
import com.tessera.backend.daily.DailyPuzzleRepository.Puzzle;
import com.tessera.backend.game.Difficulty;
import com.tessera.backend.words.EmptyWordPoolException;
import com.tessera.backend.words.WordRepository;
import com.tessera.backend.words.WordRepository.WordRow;
import java.security.SecureRandom;
import java.time.Clock;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

/**
 * Assigns each UTC date a word and stores it. Unlike the frontend's public
 * fallback algorithm, the choice uses a secure random source, so the answer
 * cannot be derived from client code — it only exists in the database.
 */
@Service
public class DailyScheduleService {

    private static final Logger log = LoggerFactory.getLogger(DailyScheduleService.class);
    private static final SecureRandom RANDOM = new SecureRandom();

    private final DailyPuzzleRepository puzzles;
    private final WordRepository words;
    private final TesseraProperties.Daily config;
    private final Clock clock;

    public DailyScheduleService(DailyPuzzleRepository puzzles, WordRepository words, TesseraProperties properties, Clock clock) {
        this.puzzles = puzzles;
        this.words = words;
        this.config = properties.daily();
        this.clock = clock;
    }

    public LocalDate today() {
        return LocalDate.now(clock);
    }

    public int puzzleNumber(LocalDate date) {
        return (int) ChronoUnit.DAYS.between(config.epoch(), date) + 1;
    }

    public Puzzle puzzleFor(LocalDate date) {
        return puzzles.find(date).orElseGet(() -> assign(date));
    }

    /** Runs at boot and shortly after every UTC midnight. */
    @Scheduled(cron = "0 5 0 * * *", zone = "UTC")
    public void ensureUpcomingPuzzles() {
        LocalDate today = today();
        for (int i = 0; i <= config.pregenerateDays(); i++) puzzleFor(today.plusDays(i));
        log.info("Daily puzzles assigned through {}", today.plusDays(config.pregenerateDays()));
    }

    private Puzzle assign(LocalDate date) {
        if (date.isBefore(config.epoch())) throw new IllegalArgumentException("No puzzles before " + config.epoch());
        Difficulty difficulty = Difficulty.forDate(date);
        List<WordRow> pool = difficulty.fallbackOrder().stream()
                .map(tier -> words.findPool(config.wordLength(), tier))
                .filter(p -> !p.isEmpty())
                .findFirst()
                .orElseThrow(() -> new EmptyWordPoolException(config.wordLength()));

        WordRow chosen = choose(pool, puzzles.lastUsedDates(), date);
        puzzles.insertIfAbsent(date, puzzleNumber(date), difficulty, chosen.id());
        return puzzles.find(date).orElseThrow();
    }

    /**
     * Never-used words first, so the whole pool is cycled before any repeat.
     * After that, only words not used within the recent gap, falling back to the
     * least recently used half of the pool.
     */
    WordRow choose(List<WordRow> pool, Map<Long, LocalDate> lastUsed, LocalDate date) {
        List<WordRow> candidates = pool.stream().filter(w -> !lastUsed.containsKey(w.id())).toList();
        if (candidates.isEmpty()) {
            LocalDate cutoff = date.minusDays(config.recentGapDays());
            candidates = pool.stream().filter(w -> lastUsed.get(w.id()).isBefore(cutoff)).toList();
        }
        if (candidates.isEmpty()) {
            List<WordRow> oldestFirst = pool.stream()
                    .sorted(Comparator.comparing((WordRow w) -> lastUsed.get(w.id())))
                    .toList();
            candidates = oldestFirst.subList(0, Math.max(1, oldestFirst.size() / 2));
        }
        return candidates.get(RANDOM.nextInt(candidates.size()));
    }
}
