-- Migration 003: Fantasy Scoring Tables
-- Rulesets and computed fantasy points

-- Fantasy scoring rulesets
CREATE TABLE IF NOT EXISTS fantasy_rulesets (
    ruleset_id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    batting_rules JSONB NOT NULL,
    pitching_rules JSONB NOT NULL,
    bonus_rules JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Computed fantasy points per game
CREATE TABLE IF NOT EXISTS fantasy_game_points (
    id SERIAL PRIMARY KEY,
    ruleset_id VARCHAR(50) NOT NULL REFERENCES fantasy_rulesets(ruleset_id),
    game_id VARCHAR(20) NOT NULL REFERENCES games(game_id),
    player_id VARCHAR(10) NOT NULL REFERENCES players(player_id),
    stat_type VARCHAR(10) NOT NULL,
    total_points DECIMAL(10,2) NOT NULL,
    breakdown JSONB NOT NULL,
    game_date DATE NOT NULL,
    calculated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(ruleset_id, game_id, player_id, stat_type)
);

CREATE INDEX IF NOT EXISTS idx_fantasy_points_player ON fantasy_game_points(player_id, ruleset_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_points_date ON fantasy_game_points(game_date);
CREATE INDEX IF NOT EXISTS idx_fantasy_points_ruleset ON fantasy_game_points(ruleset_id);
