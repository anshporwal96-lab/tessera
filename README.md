# Tessera

A daily word-guessing game with unlimited replay. Guess the hidden word; tiles
turn **green** (right letter, right spot), **amber** (in the word, wrong spot) or
**grey** (not in the word).

- **Daily Challenge** — one five-letter puzzle per UTC day, identical for every
  player. Difficulty follows the day of the week (easy weekdays, hard Saturday,
  very hard Sunday). Progress survives refreshes; one attempt per day per browser.
- **Unlimited** — 4–8 letter words, Easy/Medium/Hard, 1/3/5/10/endless rounds,
  optional category hint, session and all-time stats.

## Status

| Phase | Scope | State |
|---|---|---|
| 1 | Playable frontend: both modes, word bank, dictionary validation, keyboard input, tile colours | **Done** |
| 2 | Daily difficulty schedule, persistent progress, stats, streaks, results & share | **Done** (browser storage) |
| 3 | Spring Boot API, PostgreSQL, server-held daily answer, anonymous players, community results | **Done** — accounts and named leaderboards not built |
| 4 | Rate limiting, production profile, Docker/nginx deployment, accessibility pass, faster tests | **Done** — Docker images not built on this machine (no Docker); see below |

## Run it

Requirements: Node.js 18+ (tested on 24 LTS), Java 21+ (tested on 25),
PostgreSQL 14+ (tested on 17). Maven is not needed — the backend ships the Maven Wrapper.

**1. Database (once).** Create the `tessera` role and database:

```bash
cd tessera/backend && powershell -ExecutionPolicy Bypass -File scripts/setup-local-db.ps1
```

**2. Backend** (port 8080; Flyway creates the tables and the word bank is seeded on start):

```bash
cd tessera/backend && ./mvnw spring-boot:run
```

**3. Frontend** (port 5173; `/api` is proxied to the backend):

```bash
cd tessera/frontend && npm install && npm run dev
```

Open http://localhost:5173.

No backend? `npm run dev:offline` runs the old browser-only mode (daily answer
computed in the browser — fine for development, not secret).

### Other commands

```bash
cd tessera/backend && ./mvnw test           # API + DB tests on an embedded PostgreSQL (no server needed)
cd tessera/frontend && npm test             # frontend unit + accessibility (axe) tests
cd tessera/frontend && npm run build        # production build into dist/ (expects the API at /api)
cd tessera/frontend && npm run export:bank  # copy the word bank + 5-letter dictionary into the backend
```

The backend tests keep their embedded PostgreSQL cluster in
`backend/target/embedded-pg` so later runs skip `initdb` (~20 s on Windows).
If a test run is killed and the next one cannot start PostgreSQL, run
`./mvnw clean test`.

## Deploy

### Docker Compose (recommended)

`docker-compose.yml` runs PostgreSQL 17, the API (prod profile) and nginx
serving the frontend. Only nginx is published; the API and database stay on the
internal network.

```bash
cd tessera && cp .env.example .env
```

Edit `.env` and set a long random `TESSERA_DB_PASSWORD`, then:

```bash
cd tessera && docker compose up --build -d
```

Open http://localhost:8000. Put a TLS-terminating proxy or load balancer in
front for a public site, then enable the HSTS line in
`frontend/nginx/security-headers.conf`.

> These Docker files have **not been built or run here** (Docker isn't
> installed on the development machine). What was verified: the backend jar in
> the `prod` profile against PostgreSQL 17 (health probes, forwarded-IP rate
> limiting, fail-fast config), and the production frontend build served with the
> exact nginx security headers (no CSP violations; fonts, styles and `/api` work).

### Without Docker

- **API:** `./mvnw package` → `java -jar target/tessera-backend-0.1.0.jar` with
  `SPRING_PROFILES_ACTIVE=prod` and the variables below.
- **Frontend:** `npm run build` → serve `dist/` with any static server that
  falls back to `index.html` and proxies `/api/` to the API (see
  `frontend/nginx/default.conf`).

### Production settings (`SPRING_PROFILES_ACTIVE=prod`)

| Variable | Required | Notes |
|---|---|---|
| `TESSERA_DB_URL` | yes | e.g. `jdbc:postgresql://db:5432/tessera` |
| `TESSERA_DB_USER` / `TESSERA_DB_PASSWORD` | yes | |
| `TESSERA_CORS_ORIGINS` | yes | public site origin(s), comma-separated |
| `TESSERA_DB_POOL_SIZE` | no | default 10 |
| `PORT` | no | default 8080 |

Startup fails with a message naming any missing variable. The prod profile also
enables graceful shutdown, response compression, hidden error details and
`/actuator/health/liveness` + `/readiness` probes. It trusts `X-Forwarded-For`
from the reverse proxy, so **the API must only be reachable through that
proxy**, which must overwrite (not append to) the header — the bundled nginx
config does.

### Rate limits

Per client IP, in the API (token buckets; values in `application.yml`,
overridable with environment variables such as `TESSERA_RATELIMIT_GUESS_CAPACITY`
or `TESSERA_RATELIMIT_ENABLED=false`):

| Requests | Burst | Sustained |
|---|---|---|
| New players (`POST /api/players`) | 30 | 1 / minute |
| Guesses | 30 | 30 / minute |
| Other API reads | 120 | 120 / minute |

Over the limit → `429` with `Retry-After`; the app shows "Too many requests".
nginx adds a coarse 20 req/s per-IP limit in front. The API's buckets are in
memory, so with several API instances each counts separately — use the nginx
limit or a shared store (e.g. Redis) if you scale out.

## Accessibility

- Every page has a `main` landmark and one `h1`; focus moves to it on navigation.
- Board rows are labelled for screen readers ("Guess 2, CRANE: C correct, …")
  and each scored guess and the result are announced through a live region.
- Dialogs trap focus, close with Escape, restore focus, and make the page behind
  them `inert`.
- Colour contrast meets WCAG AA in light and dark themes (checked with axe in
  a real browser); a high-contrast orange/blue tile palette is in Settings;
  reduced-motion preferences are respected.
- `src/a11y.test.tsx` runs axe on every page and dialog in CI-friendly jsdom
  (contrast excluded there, since jsdom can't render colours).

## How the daily answer stays secret

- The server assigns each date's word with a cryptographically secure random
  choice and stores it in `daily_puzzle`. It is never derivable from client code.
- `GET /api/daily/today` returns the player's board and evaluations; the
  `answer` field appears only once that player has won or used all guesses.
- Guesses are validated and scored on the server; one attempt per player per
  day is enforced in the database.
- Puzzles are assigned 7 days ahead and never change once stored.

## Known limitations

1. **Players are anonymous** (a random token in `localStorage`). Clearing site
   data creates a new player, which can replay the day. Accounts would close
   this; they are not built yet.
2. **Rate limits are per API instance** (in memory) — see Rate limits above.
3. **Community results** show the share of players who solved a day; there is
   no named leaderboard (that needs accounts).
4. Unlimited mode is still entirely client-side by design — its answers are
   not secret, and its stats are per browser.
5. The offline build (`--mode offline`) has the old limitations: the answer
   can be computed from the bundle and stats live in one browser.
6. The accepted-guess dictionary comes from the MIT-licensed
   [`word-list`](https://github.com/sindresorhus/word-list) package; it is
   generous (it accepts some obscure words), which suits a guessing game.

## Project layout

```
tessera/
├── README.md
├── docker-compose.yml, .env.example
├── docs/ARCHITECTURE.md        architecture, API, data model, scheduling
├── backend/                    Spring Boot 3.5 + PostgreSQL
│   ├── Dockerfile, pom.xml, mvnw, mvnw.cmd
│   ├── scripts/setup-local-db.ps1
│   └── src/main/
│       ├── java/com/tessera/backend/
│       │   ├── config/         properties, CORS, clock, prod settings check
│       │   ├── daily/          controller, game service, scheduler, repositories
│       │   ├── game/           GuessEvaluator, Difficulty schedule
│       │   ├── player/         anonymous token players
│       │   ├── ratelimit/      token-bucket limiter + servlet filter
│       │   ├── words/          word bank seeding, dictionary
│       │   └── web/            API errors
│       └── resources/
│           ├── application.yml, application-prod.yml
│           ├── db/migration/   Flyway SQL
│           └── words/          bank.csv + dict-5.txt (exported from the frontend)
└── frontend/
    ├── Dockerfile, nginx/      production image: nginx config + security headers
    ├── index.html
    ├── scripts/build-dictionary.mjs
    └── src/
        ├── engine/             pure game logic, no React (fully unit-tested)
        │   ├── evaluate.ts       guess scoring incl. duplicate letters
        │   ├── game.ts           board state machine (type, delete, submit, win/loss)
        │   ├── daily.ts          weekday difficulty + deterministic daily answer
        │   ├── dates.ts          UTC date keys, countdown
        │   ├── rng.ts            seeded hash / PRNG / shuffle
        │   ├── wordSelection.ts  pools, random picks, max guesses
        │   ├── rounds.ts         multi-round Unlimited matches
        │   ├── stats.ts          stats, streaks, distribution
        │   └── share.ts          emoji results grid
        ├── data/
        │   ├── wordBank.ts       curated answers with tier, familiarity, category
        │   ├── dictionary.ts     lazy per-length accepted-guess lists
        │   └── dict/words-N.txt  generated dictionaries
        ├── services/           side effects: storage, daily service, sound, toasts
        ├── hooks/              settings context, game controller, router, UTC clock
        ├── components/         GameBoard, LetterTile, Keyboard, modals, selectors…
        ├── pages/              HomePage, DailyChallenge, UnlimitedMode, StatisticsPage
        └── styles/             design tokens + component styles
```
