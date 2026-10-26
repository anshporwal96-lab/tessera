# Tessera architecture

## Layers

```
 React pages & components        (UI only: render state, forward input)
          │
 hooks/useGameController         (input → engine → animation timing → callbacks)
          │
 services/                       (side effects behind small interfaces)
   ├─ DailyService ──────────────► LocalDailyService today, HttpDailyService in Phase 3
   ├─ progress / storage          localStorage + sessionStorage, validated on read
   └─ sound, toast
          │
 engine/                         (pure TypeScript, no DOM, no React — unit-tested)
 data/                           (curated word bank + generated dictionaries)
```

Key design choice: **the game board state never contains the daily answer.**
`GameState` holds guesses and their evaluations only; scoring is done by an
injected `evaluate(guess, attempt)` function. In Unlimited mode that function
closes over a locally chosen word. In Daily mode it calls
`DailyService.submitGuess`, which in Phase 3 becomes an HTTP call, so the UI
does not change when the answer moves to the server.

## Guess evaluation

`engine/evaluate.ts` scores in two passes:

1. Mark exact matches green and count the answer's remaining (unmatched) letters.
2. Walk the guess left to right; a non-green letter is amber only while that
   letter still has unmatched copies, otherwise grey.

So a letter never lights up more times than it occurs in the answer, and an
exact match always takes priority over an earlier misplaced copy.

## Daily schedule

All dates are UTC calendar days (`YYYY-MM-DD`); the puzzle changes at 00:00 UTC
for everyone. Puzzle #1 is 2025-01-01.

| Day | Tier | Pool (5-letter words) |
|---|---|---|
| Mon, Tue, Thu | Easy | everyday words |
| Wed, Fri | Medium | familiar words, less common letters/patterns |
| Sat | Hard | recognisable but less common vocabulary, J/Q/X/Z, Y-as-vowel |
| Sun | Very Hard | obscure-but-fair words, repeated letters, few or no vowels |

Every daily answer is five letters; difficulty comes from familiarity and
letter pattern, not length.

Answer selection (`engine/daily.ts → getDailyAnswer`):

1. `difficulty = WEEKLY_SCHEDULE[utcWeekday(date)]`.
2. `n` = how many earlier days used that same tier (closed-form count).
3. The tier's pool is sorted alphabetically (so source order doesn't matter),
   then walked in *cycles*: cycle `c` is a seeded Fisher–Yates shuffle with
   seed `"tessera-daily-v1:<tier>:<c>"`.
4. Words used at the end of cycle `c-1` are moved to the end of cycle `c`, so a
   word never repeats within a cycle and repeats are at least 20 same-tier
   puzzles apart across cycle boundaries.
5. If a tier's pool is empty the nearest tier is used; if there are no
   five-letter words at all an `EmptyWordPoolError` is thrown and the page
   shows an error.

No `Math.random` is involved; refreshing, switching browsers or devices gives
the same answer.

## Persistence (current, browser only)

| Key (prefix `tessera:v1:`) | Store | Contents |
|---|---|---|
| `daily:progress` | local | today's board, answer once finished, `recorded` flag |
| `daily:stats` | local | played, wins, streaks, distribution, last played/won dates |
| `unlimited:match` | local | current multi-round match (config, round, results, board) |
| `unlimited:config` | local | last chosen length / difficulty / rounds |
| `unlimited:stats` | local | all-time Unlimited stats |
| `unlimited:session` | session | stats for this browser session |
| `unlimited:recent` | local | last 40 Unlimited answers (avoid repeats) |
| `settings`, `rules:seen` | local | theme, sound, animations, high-contrast |

Every read is validated; corrupt or stale data is discarded rather than crashing.
Yesterday's daily board is ignored automatically because progress is keyed by date.

## Backend (Phase 3 — implemented)

Spring Boot 3.5 (Java 21 bytecode), Spring JDBC (`JdbcClient`), Flyway, PostgreSQL.

```
backend/src/main/java/com/tessera/backend/
├── StartupInitializer      seeds words/bank.csv into `word`, assigns upcoming puzzles
├── config/                 TesseraProperties, CORS, UTC Clock bean
├── game/                   GuessEvaluator (port of evaluate.ts), Difficulty + weekday schedule
├── words/                  WordBankSource (CSV), WordRepository, Dictionary (dict-5.txt + bank)
├── player/                 PlayerService: anonymous bearer tokens (SHA-256 hashed at rest)
├── daily/                  DailyController, DailyGameService, DailyScheduleService,
│                           DailyPuzzleRepository, AttemptRepository, DTOs
└── web/                    ApiException + handler → { error, message }
```

### Which mode the frontend uses

`services/dailyService.ts` picks `HttpDailyService` when `VITE_API_URL` is set
(`.env` sets `/api`; Vite proxies it to `localhost:8080` in development) and
`LocalDailyService` otherwise (`npm run dev:offline`, `.env.offline`). In server
mode the server's saved attempt and stats are the source of truth; browser
storage is only a cache used to render instantly.

### API

All player endpoints take `Authorization: Bearer <token>`. Errors are
`{ "error": "<code>", "message": "…" }`.

| Method & path | Purpose | Notable responses |
|---|---|---|
| `POST /api/players` | create an anonymous player | `201 { token }` |
| `GET /api/daily/today` | today's puzzle (server's UTC date) + this player's board | `answer` only when `status` ≠ `playing` |
| `POST /api/daily/{date}/guesses` `{ guess }` | score a guess | `400 invalid-word / incomplete / invalid-format`, `409 game-over / not-today` |
| `GET /api/players/me/stats` | played, wins, streaks, distribution | same shape as the frontend `GameStats` |
| `GET /api/daily/{date}/summary` | players, solved, distribution — no answer | `404` for future dates |
| `GET /actuator/health` | health check | |

`not-today` covers the midnight boundary: a guess for yesterday's puzzle sent
after 00:00 UTC is refused and the client reloads today's puzzle.

### Data model

See `src/main/resources/db/migration/V1__initial_schema.sql`:
`word`, `daily_puzzle` (one row per date, never rewritten), `player`
(`token_hash` only), `daily_attempt` (one per player per date, status +
guess count, row-locked while scoring), `daily_guess` (each guess in order).

### Server-side scheduling

`DailyScheduleService` differs deliberately from the public client algorithm:

1. Difficulty from the same weekday table.
2. Pool = active 5-letter words of that tier (with the same tier fallback).
3. Choose with `SecureRandom` among words **never used** as a daily answer;
   once all have been used, among words not used in the last 180 days; failing
   that, from the least-recently-used half.
4. `insert … on conflict do nothing`, then re-read — concurrent requests agree
   on one word.
5. At startup and 00:05 UTC every day, the next 7 days are assigned in advance.

Because the word comes from a secure random source and lives only in the
database, it cannot be computed from the JavaScript bundle.

### Word data flow

`frontend/src/data/wordBank.ts` is the single source.
`npm run export:bank` writes `backend/src/main/resources/words/bank.csv` and
copies the 5-letter guess dictionary; on startup the backend upserts the CSV
into `word` (never deleting, so past puzzles stay valid).

## Hardening (Phase 4)

### Rate limiting

`ratelimit/RateLimitFilter` runs before the controllers on `/api/**` and
classifies each request as *register* (`POST /api/players`), *guess*
(`POST …/guesses`) or *read*. `RateLimiter` keeps one token bucket per
(kind, client IP) in a `ConcurrentHashMap`; buckets that are full and idle for
10 minutes are evicted every 5 minutes, or immediately when `max-clients` is
reached, so memory stays bounded. Rejections are `429 {error: "rate-limited"}`
with `Retry-After`. Health checks (`/actuator`) are not limited.

Client IP: `request.getRemoteAddr()`. In the prod profile
`server.forward-headers-strategy=framework` makes that the `X-Forwarded-For`
value, which nginx overwrites with the real peer address. A deployment that
exposes the API directly would let clients spoof that header — keep the API
on an internal network.

### Production profile

`application-prod.yml` removes the dev database defaults;
`config/RequiredSettingsCheck` (an `EnvironmentPostProcessor`) stops startup
with a clear message if a required variable is missing. Also: graceful
shutdown, compression, no error details, health probes.

### Deployment

```
browser ──► nginx (web container, :80)
              ├─ /            static dist/, SPA fallback, security headers, CSP
              ├─ /assets/     1-year immutable cache
              └─ /api/        20 r/s per-IP limit ──► api:8080 (Spring Boot, prod)
                                                       └──► db:5432 (PostgreSQL 17, volume)
```

The CSP allows only same-origin scripts and API calls plus Google Fonts. React
sets the board's CSS variables through the CSSOM, which CSP permits without
`'unsafe-inline'` (verified with the production build).

### Accessibility

- Board: `role="group"` rows with descriptive labels; tiles are `aria-hidden`.
- `services/announcer` + `components/Announcer`: polite live region (rendered
  outside `#root`) announcing each scored guess and the outcome.
- Dialogs render into `<body>` via a portal and set `#root.inert` while open.
- Inner pages have a visually hidden `h1`; focus moves to it on route change.
- Light-theme tier colours were darkened to pass 4.5:1 on badges and tiles.

## Testing

`./mvnw test` (backend) starts a real embedded PostgreSQL, runs the Flyway
migrations and exercises the API through MockMvc with a controllable clock:
answer never leaked before game over, same answer for all players, refresh
resumes progress, one attempt per day, win on the sixth guess, loss reveals the
answer, invalid / incomplete / malformed guesses, UTC-midnight rollover and
stale-date guesses, Saturday/Sunday pools, no repeats before a pool is used up,
stored puzzles never change, streak stats, spoiler-free community summary.
`GuessEvaluatorTest` runs the same cases as the frontend's evaluator tests.
`RateLimiterTest` (fake clock) covers bursts, refill, per-client isolation and
eviction; `RateLimitIntegrationTest` checks 429 + `Retry-After` over HTTP.

Speed: the suite went from ~106 s to ~11 s (warm). The test DataSource is
pooled with Hikari (the raw embedded DataSource opened a new PostgreSQL backend
per query, ~100 ms each on Windows), the embedded cluster is reused across runs
from `target/embedded-pg` (skipping a ~20 s `initdb`), fsync is off for the
throwaway database, and the word bank is seeded with one batched transaction.

`npm test` (frontend) runs Vitest over the engine, data and HTTP client:

- evaluation: exact, absent, present, duplicate letters in guess and answer, other lengths
- game state: invalid / incomplete words, win on final attempt, loss, JSON round-trip (refresh)
- daily: weekday tiers, Saturday/Sunday pools, determinism, order independence, UTC midnight
  boundary, month/leap-year boundaries, repeat spacing over three cycles, empty-pool fallback
- rounds: fixed and endless matches, restart, new word each round, persistence validation
- stats: streak continuation / reset / lapse, one result per day, averages
- data: word lengths, duplicates, pool sizes, dictionary contains every answer
