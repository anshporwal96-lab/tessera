-- Curated answer bank, seeded from words/bank.csv at startup.
create table word (
    id          bigserial    primary key,
    word        varchar(16)  not null unique,
    length      smallint     not null,
    difficulty  varchar(16)  not null check (difficulty in ('easy', 'medium', 'hard', 'veryhard')),
    commonness  smallint     not null check (commonness between 1 and 5),
    category    varchar(32)  not null,
    active      boolean      not null default true
);
create index word_pool_idx on word (length, difficulty) where active;

-- One row per UTC date. Once written, a day's answer never changes.
create table daily_puzzle (
    puzzle_date    date         primary key,
    puzzle_number  int          not null unique,
    difficulty     varchar(16)  not null,
    word_id        bigint       not null references word (id),
    created_at     timestamptz  not null default now()
);
create index daily_puzzle_word_idx on daily_puzzle (word_id, puzzle_date);

-- Anonymous players identified by a bearer token; only its SHA-256 hash is stored.
create table player (
    id            uuid         primary key,
    token_hash    char(64)     not null unique,
    created_at    timestamptz  not null default now(),
    last_seen_at  timestamptz  not null default now()
);

-- A player's single official attempt at a day's puzzle.
create table daily_attempt (
    player_id     uuid         not null references player (id) on delete cascade,
    puzzle_date   date         not null references daily_puzzle (puzzle_date),
    status        varchar(8)   not null default 'playing' check (status in ('playing', 'won', 'lost')),
    guess_count   smallint     not null default 0,
    started_at    timestamptz  not null default now(),
    completed_at  timestamptz,
    primary key (player_id, puzzle_date)
);
create index daily_attempt_date_idx on daily_attempt (puzzle_date, status);

create table daily_guess (
    player_id    uuid         not null,
    puzzle_date  date         not null,
    attempt_no   smallint     not null,
    guess        varchar(16)  not null,
    created_at   timestamptz  not null default now(),
    primary key (player_id, puzzle_date, attempt_no),
    foreign key (player_id, puzzle_date) references daily_attempt (player_id, puzzle_date) on delete cascade
);
