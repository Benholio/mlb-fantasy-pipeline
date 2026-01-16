/**
 * Database entity types (typed representations of database rows)
 */

export interface Player {
  player_id: string;
  created_at: Date;
}

export interface Team {
  team_id: string;
  created_at: Date;
}

export interface Game {
  game_id: string;
  game_date: Date;
  game_number: number;
  site: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  game_type: string | null;
  has_box: boolean;
  has_pbp: boolean;
  created_at: Date;
}

export interface BatterGameStats {
  id: number;
  game_id: string;
  player_id: string;
  team_id: string;
  is_home: boolean;
  opponent_id: string | null;

  // Stats
  plate_appearances: number;
  at_bats: number;
  runs: number;
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  runs_batted_in: number;
  sacrifice_hits: number;
  sacrifice_flies: number;
  hit_by_pitch: number;
  walks: number;
  intentional_walks: number;
  strikeouts: number;
  stolen_bases: number;
  caught_stealing: number;
  grounded_into_dp: number;
  reached_on_interference: number;
  reached_on_error: number;

  // Role flags
  is_dh: boolean;
  is_ph: boolean;
  is_pr: boolean;

  // Outcome
  team_won: boolean | null;
  team_lost: boolean | null;
  team_tied: boolean | null;

  // Metadata
  stat_type: string | null;
  lineup_position: number | null;
  batting_seq: number | null;

  created_at: Date;
}

export interface PitcherGameStats {
  id: number;
  game_id: string;
  player_id: string;
  team_id: string;
  is_home: boolean;
  opponent_id: string | null;

  // Stats
  outs_pitched: number;
  batters_faced: number;
  hits_allowed: number;
  doubles_allowed: number;
  triples_allowed: number;
  home_runs_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  walks: number;
  intentional_walks: number;
  strikeouts: number;
  hit_batters: number;
  wild_pitches: number;
  balks: number;
  sacrifice_hits_allowed: number;
  sacrifice_flies_allowed: number;
  stolen_bases_allowed: number;
  caught_stealing: number;

  // Decision flags
  won: boolean;
  lost: boolean;
  saved: boolean;
  game_started: boolean;
  game_finished: boolean;
  complete_game: boolean;

  // Outcome
  team_won: boolean | null;
  team_lost: boolean | null;
  team_tied: boolean | null;

  // Metadata
  stat_type: string | null;
  pitching_seq: number | null;

  created_at: Date;
}

export interface IngestionBatch {
  batch_id: string;
  source_type: 'batting' | 'pitching';
  source_file: string;
  year: number;
  started_at: Date;
  completed_at: Date | null;
  total_rows: number | null;
  processed_rows: number;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  error_message: string | null;
}
