package com.tessera.backend.daily;

import com.tessera.backend.config.TesseraProperties;
import com.tessera.backend.daily.AttemptRepository.Attempt;
import com.tessera.backend.daily.AttemptRepository.FinishedAttempt;
import com.tessera.backend.daily.DailyDtos.DailyState;
import com.tessera.backend.daily.DailyDtos.DailySummary;
import com.tessera.backend.daily.DailyDtos.GuessResult;
import com.tessera.backend.daily.DailyDtos.PlayerStats;
import com.tessera.backend.daily.DailyPuzzleRepository.Puzzle;
import com.tessera.backend.game.GuessEvaluator;
import com.tessera.backend.game.LetterState;
import com.tessera.backend.web.ApiException;
import com.tessera.backend.words.Dictionary;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.UUID;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class DailyGameService {

    private static final int DISTRIBUTION_SIZE = 7;

    private final DailyScheduleService schedule;
    private final AttemptRepository attempts;
    private final Dictionary dictionary;
    private final TesseraProperties.Daily config;

    public DailyGameService(DailyScheduleService schedule, AttemptRepository attempts, Dictionary dictionary, TesseraProperties properties) {
        this.schedule = schedule;
        this.attempts = attempts;
        this.dictionary = dictionary;
        this.config = properties.daily();
    }

    /** Today's puzzle with this player's progress. The answer is included only once they have finished. */
    public DailyState today(UUID playerId) {
        LocalDate date = schedule.today();
        Puzzle puzzle = schedule.puzzleFor(date);
        List<String> guesses = attempts.guesses(playerId, date);
        String status = attempts.status(playerId, date);
        List<List<LetterState>> evaluations = guesses.stream()
                .map(g -> GuessEvaluator.evaluate(g, puzzle.answer()))
                .toList();
        boolean over = !"playing".equals(status);
        return new DailyState(
                date.toString(),
                puzzle.puzzleNumber(),
                puzzle.difficulty(),
                config.wordLength(),
                config.maxGuesses(),
                guesses,
                evaluations,
                status,
                over ? puzzle.answer() : null,
                date.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant().toString());
    }

    @Transactional
    public GuessResult submit(UUID playerId, LocalDate date, String rawGuess) {
        if (!date.equals(schedule.today())) {
            throw ApiException.conflict("not-today", "That puzzle has ended. Reload to play today's puzzle.");
        }
        String guess = rawGuess == null ? "" : rawGuess.trim().toUpperCase();
        if (!guess.matches("[A-Z]*")) throw ApiException.badRequest("invalid-format", "Guesses may only contain letters");
        if (guess.length() != config.wordLength()) throw ApiException.badRequest("incomplete", "Not enough letters");
        if (!dictionary.isValid(guess)) throw ApiException.badRequest("invalid-word", "Not in word list");

        Puzzle puzzle = schedule.puzzleFor(date);
        Attempt attempt = attempts.lockOrCreate(playerId, date);
        if (!"playing".equals(attempt.status())) {
            throw ApiException.conflict("game-over", "You have already finished today's puzzle");
        }

        int attemptNo = attempt.guessCount() + 1;
        List<LetterState> evaluation = GuessEvaluator.evaluate(guess, puzzle.answer());
        boolean solved = GuessEvaluator.isSolved(evaluation);
        boolean gameOver = solved || attemptNo >= config.maxGuesses();
        String status = solved ? "won" : gameOver ? "lost" : "playing";
        attempts.addGuess(playerId, date, attemptNo, guess, status);

        return new GuessResult(evaluation, solved, gameOver, attemptNo, gameOver ? puzzle.answer() : null);
    }

    /** Same rules as recordDailyGame in the frontend's engine/stats.ts. */
    public PlayerStats stats(UUID playerId) {
        List<Integer> distribution = new ArrayList<>(Collections.nCopies(DISTRIBUTION_SIZE, 0));
        int played = 0, wins = 0, streak = 0, maxStreak = 0, winningGuessTotal = 0;
        LocalDate lastPlayed = null, lastWin = null;
        for (FinishedAttempt a : attempts.finished(playerId)) {
            played++;
            if (a.won()) {
                wins++;
                winningGuessTotal += a.guessCount();
                int idx = Math.min(Math.max(a.guessCount(), 1), DISTRIBUTION_SIZE) - 1;
                distribution.set(idx, distribution.get(idx) + 1);
                streak = lastWin != null && lastWin.equals(a.date().minusDays(1)) ? streak + 1 : 1;
                lastWin = a.date();
            } else {
                streak = 0;
            }
            maxStreak = Math.max(maxStreak, streak);
            lastPlayed = a.date();
        }
        return new PlayerStats(played, wins, streak, maxStreak, distribution, winningGuessTotal,
                lastPlayed == null ? null : lastPlayed.toString(),
                lastWin == null ? null : lastWin.toString());
    }

    /** Spoiler-free aggregate for a day that has started. */
    public DailySummary summary(LocalDate date) {
        if (date.isAfter(schedule.today())) throw ApiException.notFound("That puzzle has not been released yet");
        List<Integer> distribution = new ArrayList<>(Collections.nCopies(config.maxGuesses(), 0));
        int players = 0, solved = 0;
        for (FinishedAttempt a : attempts.finishedOn(date)) {
            players++;
            if (a.won()) {
                solved++;
                int idx = Math.min(Math.max(a.guessCount(), 1), config.maxGuesses()) - 1;
                distribution.set(idx, distribution.get(idx) + 1);
            }
        }
        return new DailySummary(date.toString(), players, solved, distribution);
    }
}
