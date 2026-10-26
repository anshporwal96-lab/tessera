package com.tessera.backend;

import com.tessera.backend.daily.DailyScheduleService;
import com.tessera.backend.words.WordBankSource;
import com.tessera.backend.words.WordRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.stereotype.Component;

/**
 * On boot: sync the word bank into the database, then assign upcoming daily
 * puzzles. Runs during context initialisation (after Flyway), so the web
 * server never accepts a request before the words exist.
 */
@Component
public class StartupInitializer implements InitializingBean {

    private static final Logger log = LoggerFactory.getLogger(StartupInitializer.class);

    private final WordBankSource bank;
    private final WordRepository words;
    private final DailyScheduleService schedule;

    public StartupInitializer(WordBankSource bank, WordRepository words, DailyScheduleService schedule) {
        this.bank = bank;
        this.words = words;
        this.schedule = schedule;
    }

    @Override
    public void afterPropertiesSet() {
        seedWords();
        try {
            schedule.ensureUpcomingPuzzles();
        } catch (RuntimeException e) {
            // Keep the server up (health checks, other endpoints) and report the problem clearly.
            log.error("Could not assign daily puzzles: {}", e.getMessage());
        }
    }

    private void seedWords() {
        words.upsertAll(bank.entries());
        log.info("Word bank synced: {} words", bank.entries().size());
    }
}
