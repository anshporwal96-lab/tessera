package com.tessera.backend.daily;

import com.tessera.backend.game.Difficulty;
import com.tessera.backend.game.LetterState;
import jakarta.validation.constraints.NotNull;
import java.util.List;

/** Wire formats. `answer` is null (and therefore omitted) until the player's game is over. */
public final class DailyDtos {

    private DailyDtos() {}

    public record DailyState(
            String dateKey,
            int puzzleNumber,
            Difficulty difficulty,
            int wordLength,
            int maxGuesses,
            List<String> guesses,
            List<List<LetterState>> evaluations,
            String status,
            String answer,
            String nextPuzzleAt) {}

    public record GuessRequest(@NotNull String guess) {}

    public record GuessResult(
            List<LetterState> evaluation,
            boolean solved,
            boolean gameOver,
            int attempt,
            String answer) {}

    public record DailySummary(String dateKey, int players, int solved, List<Integer> distribution) {}

    public record PlayerStats(
            int played,
            int wins,
            int currentStreak,
            int maxStreak,
            List<Integer> distribution,
            int winningGuessTotal,
            String lastPlayedDate,
            String lastWinDate) {}

    public record NewPlayerResponse(String token) {}
}
