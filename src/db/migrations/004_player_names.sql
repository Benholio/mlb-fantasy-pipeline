-- Migration 004: Add player name columns

ALTER TABLE players
ADD COLUMN IF NOT EXISTS name_first VARCHAR(50),
ADD COLUMN IF NOT EXISTS name_last VARCHAR(50),
ADD COLUMN IF NOT EXISTS name_given VARCHAR(100);
