package com.tessera.backend.daily;

import com.tessera.backend.daily.DailyDtos.DailyState;
import com.tessera.backend.daily.DailyDtos.DailySummary;
import com.tessera.backend.daily.DailyDtos.GuessRequest;
import com.tessera.backend.daily.DailyDtos.GuessResult;
import com.tessera.backend.daily.DailyDtos.NewPlayerResponse;
import com.tessera.backend.daily.DailyDtos.PlayerStats;
import com.tessera.backend.player.PlayerService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api")
public class DailyController {

    private final PlayerService players;
    private final DailyGameService game;

    public DailyController(PlayerService players, DailyGameService game) {
        this.players = players;
        this.game = game;
    }

    @PostMapping("/players")
    @ResponseStatus(HttpStatus.CREATED)
    public NewPlayerResponse register() {
        return new NewPlayerResponse(players.register().token());
    }

    @GetMapping("/players/me/stats")
    public PlayerStats stats(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return game.stats(players.requirePlayer(auth));
    }

    @GetMapping("/daily/today")
    public DailyState today(@RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth) {
        return game.today(players.requirePlayer(auth));
    }

    @PostMapping("/daily/{date}/guesses")
    public GuessResult guess(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String auth,
            @PathVariable LocalDate date,
            @Valid @RequestBody GuessRequest body) {
        return game.submit(players.requirePlayer(auth), date, body.guess());
    }

    @GetMapping("/daily/{date}/summary")
    public DailySummary summary(@PathVariable LocalDate date) {
        return game.summary(date);
    }
}
