-- Migration 002: Staging Tables
-- Raw CSV data staging and batch tracking

-- Staging table for batting CSV data (all VARCHAR for robustness)
CREATE TABLE IF NOT EXISTS staging_batting (
    id SERIAL PRIMARY KEY,
    batch_id UUID NOT NULL,
    source_file VARCHAR(100),
    row_num INTEGER,

    -- All columns from retrosplits batting CSV
    gid VARCHAR(50),
    player_id VARCHAR(50),
    team VARCHAR(50),
    game_date VARCHAR(50),
    game_number VARCHAR(50),
    site VARCHAR(50),
    vishome VARCHAR(50),
    opp VARCHAR(50),
    b_pa VARCHAR(50),
    b_ab VARCHAR(50),
    b_r VARCHAR(50),
    b_h VARCHAR(50),
    b_d VARCHAR(50),
    b_t VARCHAR(50),
    b_hr VARCHAR(50),
    b_rbi VARCHAR(50),
    b_sh VARCHAR(50),
    b_sf VARCHAR(50),
    b_hbp VARCHAR(50),
    b_w VARCHAR(50),
    b_iw VARCHAR(50),
    b_k VARCHAR(50),
    b_sb VARCHAR(50),
    b_cs VARCHAR(50),
    b_gdp VARCHAR(50),
    b_xi VARCHAR(50),
    b_roe VARCHAR(50),
    dh VARCHAR(50),
    ph VARCHAR(50),
    pr VARCHAR(50),
    win VARCHAR(50),
    loss VARCHAR(50),
    tie VARCHAR(50),
    gametype VARCHAR(50),
    box VARCHAR(50),
    pbp VARCHAR(50),
    stattype VARCHAR(50),
    b_lp VARCHAR(50),
    b_seq VARCHAR(50),

    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_staging_batting_batch ON staging_batting(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_batting_processed ON staging_batting(batch_id, processed);

-- Staging table for pitching CSV data
CREATE TABLE IF NOT EXISTS staging_pitching (
    id SERIAL PRIMARY KEY,
    batch_id UUID NOT NULL,
    source_file VARCHAR(100),
    row_num INTEGER,

    -- All columns from retrosplits pitching CSV
    gid VARCHAR(50),
    player_id VARCHAR(50),
    team VARCHAR(50),
    game_date VARCHAR(50),
    game_number VARCHAR(50),
    site VARCHAR(50),
    vishome VARCHAR(50),
    opp VARCHAR(50),
    p_ipouts VARCHAR(50),
    p_noout VARCHAR(50),
    p_bfp VARCHAR(50),
    p_h VARCHAR(50),
    p_d VARCHAR(50),
    p_t VARCHAR(50),
    p_hr VARCHAR(50),
    p_r VARCHAR(50),
    p_er VARCHAR(50),
    p_w VARCHAR(50),
    p_iw VARCHAR(50),
    p_k VARCHAR(50),
    p_hbp VARCHAR(50),
    p_wp VARCHAR(50),
    p_bk VARCHAR(50),
    p_sh VARCHAR(50),
    p_sf VARCHAR(50),
    p_sb VARCHAR(50),
    p_cs VARCHAR(50),
    p_pb VARCHAR(50),
    wp VARCHAR(50),
    lp VARCHAR(50),
    save_flag VARCHAR(50),
    gs VARCHAR(50),
    gf VARCHAR(50),
    cg VARCHAR(50),
    win VARCHAR(50),
    loss VARCHAR(50),
    tie VARCHAR(50),
    gametype VARCHAR(50),
    box VARCHAR(50),
    pbp VARCHAR(50),
    stattype VARCHAR(50),
    p_seq VARCHAR(50),

    ingested_at TIMESTAMPTZ DEFAULT NOW(),
    processed BOOLEAN DEFAULT false
);

CREATE INDEX IF NOT EXISTS idx_staging_pitching_batch ON staging_pitching(batch_id);
CREATE INDEX IF NOT EXISTS idx_staging_pitching_processed ON staging_pitching(batch_id, processed);

-- Ingestion batch tracking table
CREATE TABLE IF NOT EXISTS ingestion_batches (
    batch_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_type VARCHAR(20) NOT NULL,
    source_file VARCHAR(100) NOT NULL,
    year INTEGER NOT NULL,
    started_at TIMESTAMPTZ DEFAULT NOW(),
    completed_at TIMESTAMPTZ,
    total_rows INTEGER,
    processed_rows INTEGER DEFAULT 0,
    status VARCHAR(20) DEFAULT 'pending',
    error_message TEXT
);

CREATE INDEX IF NOT EXISTS idx_ingestion_batches_year ON ingestion_batches(year, source_type);
CREATE INDEX IF NOT EXISTS idx_ingestion_batches_status ON ingestion_batches(status);
