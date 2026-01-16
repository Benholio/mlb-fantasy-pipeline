-- Migration 001: Core Tables
-- Players, Teams, Games, and Stats tables

-- Players table (minimal - just track player IDs we've seen)
CREATE TABLE IF NOT EXISTS players (
    player_id VARCHAR(10) PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Teams table (minimal - just track team IDs we've seen)
CREATE TABLE IF NOT EXISTS teams (
    team_id VARCHAR(3) PRIMARY KEY,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Games table
CREATE TABLE IF NOT EXISTS games (
    game_id VARCHAR(20) PRIMARY KEY,
    game_date DATE NOT NULL,
    game_number SMALLINT DEFAULT 0,
    site VARCHAR(10),
    home_team_id VARCHAR(3) REFERENCES teams(team_id),
    away_team_id VARCHAR(3) REFERENCES teams(team_id),
    game_type VARCHAR(10),
    has_box BOOLEAN DEFAULT false,
    has_pbp BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_games_date ON games(game_date);
CREATE INDEX IF NOT EXISTS idx_games_home_team ON games(home_team_id);
CREATE INDEX IF NOT EXISTS idx_games_away_team ON games(away_team_id);

-- Batter game stats
CREATE TABLE IF NOT EXISTS batter_game_stats (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(20) NOT NULL REFERENCES games(game_id),
    player_id VARCHAR(10) NOT NULL REFERENCES players(player_id),
    team_id VARCHAR(3) NOT NULL REFERENCES teams(team_id),
    is_home BOOLEAN NOT NULL,
    opponent_id VARCHAR(3) REFERENCES teams(team_id),

    -- Stats (all SMALLINT DEFAULT 0)
    plate_appearances SMALLINT DEFAULT 0,
    at_bats SMALLINT DEFAULT 0,
    runs SMALLINT DEFAULT 0,
    hits SMALLINT DEFAULT 0,
    doubles SMALLINT DEFAULT 0,
    triples SMALLINT DEFAULT 0,
    home_runs SMALLINT DEFAULT 0,
    runs_batted_in SMALLINT DEFAULT 0,
    sacrifice_hits SMALLINT DEFAULT 0,
    sacrifice_flies SMALLINT DEFAULT 0,
    hit_by_pitch SMALLINT DEFAULT 0,
    walks SMALLINT DEFAULT 0,
    intentional_walks SMALLINT DEFAULT 0,
    strikeouts SMALLINT DEFAULT 0,
    stolen_bases SMALLINT DEFAULT 0,
    caught_stealing SMALLINT DEFAULT 0,
    grounded_into_dp SMALLINT DEFAULT 0,
    reached_on_interference SMALLINT DEFAULT 0,
    reached_on_error SMALLINT DEFAULT 0,

    -- Role flags
    is_dh BOOLEAN DEFAULT false,
    is_ph BOOLEAN DEFAULT false,
    is_pr BOOLEAN DEFAULT false,

    -- Outcome
    team_won BOOLEAN,
    team_lost BOOLEAN,
    team_tied BOOLEAN,

    -- Metadata
    stat_type VARCHAR(10),
    lineup_position SMALLINT,
    batting_seq SMALLINT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id, stat_type)
);

CREATE INDEX IF NOT EXISTS idx_batter_stats_player ON batter_game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_batter_stats_game ON batter_game_stats(game_id);

-- Pitcher game stats
CREATE TABLE IF NOT EXISTS pitcher_game_stats (
    id SERIAL PRIMARY KEY,
    game_id VARCHAR(20) NOT NULL REFERENCES games(game_id),
    player_id VARCHAR(10) NOT NULL REFERENCES players(player_id),
    team_id VARCHAR(3) NOT NULL REFERENCES teams(team_id),
    is_home BOOLEAN NOT NULL,
    opponent_id VARCHAR(3) REFERENCES teams(team_id),

    -- Stats
    outs_pitched SMALLINT DEFAULT 0,
    batters_faced SMALLINT DEFAULT 0,
    hits_allowed SMALLINT DEFAULT 0,
    doubles_allowed SMALLINT DEFAULT 0,
    triples_allowed SMALLINT DEFAULT 0,
    home_runs_allowed SMALLINT DEFAULT 0,
    runs_allowed SMALLINT DEFAULT 0,
    earned_runs SMALLINT DEFAULT 0,
    walks SMALLINT DEFAULT 0,
    intentional_walks SMALLINT DEFAULT 0,
    strikeouts SMALLINT DEFAULT 0,
    hit_batters SMALLINT DEFAULT 0,
    wild_pitches SMALLINT DEFAULT 0,
    balks SMALLINT DEFAULT 0,
    sacrifice_hits_allowed SMALLINT DEFAULT 0,
    sacrifice_flies_allowed SMALLINT DEFAULT 0,
    stolen_bases_allowed SMALLINT DEFAULT 0,
    caught_stealing SMALLINT DEFAULT 0,

    -- Decision flags
    won BOOLEAN DEFAULT false,
    lost BOOLEAN DEFAULT false,
    saved BOOLEAN DEFAULT false,
    game_started BOOLEAN DEFAULT false,
    game_finished BOOLEAN DEFAULT false,
    complete_game BOOLEAN DEFAULT false,

    -- Outcome
    team_won BOOLEAN,
    team_lost BOOLEAN,
    team_tied BOOLEAN,

    -- Metadata
    stat_type VARCHAR(10),
    pitching_seq SMALLINT,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(game_id, player_id, stat_type)
);

CREATE INDEX IF NOT EXISTS idx_pitcher_stats_player ON pitcher_game_stats(player_id);
CREATE INDEX IF NOT EXISTS idx_pitcher_stats_game ON pitcher_game_stats(game_id);
