import type { Sql } from '../client.js';
import type { BatterGameStats, PitcherGameStats } from '../../types/database.js';

export interface BatterStatsInsert {
  game_id: string;
  player_id: string;
  team_id: string;
  is_home: boolean;
  opponent_id: string | null;
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
  is_dh: boolean;
  is_ph: boolean;
  is_pr: boolean;
  team_won: boolean | null;
  team_lost: boolean | null;
  team_tied: boolean | null;
  stat_type: string | null;
  lineup_position: number | null;
  batting_seq: number | null;
}

export interface PitcherStatsInsert {
  game_id: string;
  player_id: string;
  team_id: string;
  is_home: boolean;
  opponent_id: string | null;
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
  won: boolean;
  lost: boolean;
  saved: boolean;
  game_started: boolean;
  game_finished: boolean;
  complete_game: boolean;
  team_won: boolean | null;
  team_lost: boolean | null;
  team_tied: boolean | null;
  stat_type: string | null;
  pitching_seq: number | null;
}

/**
 * Upsert batter game stats
 */
export async function upsertBatterStats(sql: Sql, stats: BatterStatsInsert): Promise<void> {
  await sql`
    INSERT INTO batter_game_stats (
      game_id, player_id, team_id, is_home, opponent_id,
      plate_appearances, at_bats, runs, hits, doubles, triples, home_runs,
      runs_batted_in, sacrifice_hits, sacrifice_flies, hit_by_pitch,
      walks, intentional_walks, strikeouts, stolen_bases, caught_stealing,
      grounded_into_dp, reached_on_interference, reached_on_error,
      is_dh, is_ph, is_pr, team_won, team_lost, team_tied,
      stat_type, lineup_position, batting_seq
    ) VALUES (
      ${stats.game_id}, ${stats.player_id}, ${stats.team_id}, ${stats.is_home}, ${stats.opponent_id},
      ${stats.plate_appearances}, ${stats.at_bats}, ${stats.runs}, ${stats.hits},
      ${stats.doubles}, ${stats.triples}, ${stats.home_runs}, ${stats.runs_batted_in},
      ${stats.sacrifice_hits}, ${stats.sacrifice_flies}, ${stats.hit_by_pitch},
      ${stats.walks}, ${stats.intentional_walks}, ${stats.strikeouts},
      ${stats.stolen_bases}, ${stats.caught_stealing}, ${stats.grounded_into_dp},
      ${stats.reached_on_interference}, ${stats.reached_on_error},
      ${stats.is_dh}, ${stats.is_ph}, ${stats.is_pr},
      ${stats.team_won}, ${stats.team_lost}, ${stats.team_tied},
      ${stats.stat_type}, ${stats.lineup_position}, ${stats.batting_seq}
    )
    ON CONFLICT (game_id, player_id, stat_type) DO UPDATE SET
      team_id = EXCLUDED.team_id,
      is_home = EXCLUDED.is_home,
      opponent_id = EXCLUDED.opponent_id,
      plate_appearances = EXCLUDED.plate_appearances,
      at_bats = EXCLUDED.at_bats,
      runs = EXCLUDED.runs,
      hits = EXCLUDED.hits,
      doubles = EXCLUDED.doubles,
      triples = EXCLUDED.triples,
      home_runs = EXCLUDED.home_runs,
      runs_batted_in = EXCLUDED.runs_batted_in,
      sacrifice_hits = EXCLUDED.sacrifice_hits,
      sacrifice_flies = EXCLUDED.sacrifice_flies,
      hit_by_pitch = EXCLUDED.hit_by_pitch,
      walks = EXCLUDED.walks,
      intentional_walks = EXCLUDED.intentional_walks,
      strikeouts = EXCLUDED.strikeouts,
      stolen_bases = EXCLUDED.stolen_bases,
      caught_stealing = EXCLUDED.caught_stealing,
      grounded_into_dp = EXCLUDED.grounded_into_dp,
      reached_on_interference = EXCLUDED.reached_on_interference,
      reached_on_error = EXCLUDED.reached_on_error,
      is_dh = EXCLUDED.is_dh,
      is_ph = EXCLUDED.is_ph,
      is_pr = EXCLUDED.is_pr,
      team_won = EXCLUDED.team_won,
      team_lost = EXCLUDED.team_lost,
      team_tied = EXCLUDED.team_tied,
      lineup_position = EXCLUDED.lineup_position,
      batting_seq = EXCLUDED.batting_seq
  `;
}

/**
 * Upsert pitcher game stats
 */
export async function upsertPitcherStats(sql: Sql, stats: PitcherStatsInsert): Promise<void> {
  await sql`
    INSERT INTO pitcher_game_stats (
      game_id, player_id, team_id, is_home, opponent_id,
      outs_pitched, batters_faced, hits_allowed, doubles_allowed, triples_allowed,
      home_runs_allowed, runs_allowed, earned_runs, walks, intentional_walks,
      strikeouts, hit_batters, wild_pitches, balks,
      sacrifice_hits_allowed, sacrifice_flies_allowed, stolen_bases_allowed, caught_stealing,
      won, lost, saved, game_started, game_finished, complete_game,
      team_won, team_lost, team_tied, stat_type, pitching_seq
    ) VALUES (
      ${stats.game_id}, ${stats.player_id}, ${stats.team_id}, ${stats.is_home}, ${stats.opponent_id},
      ${stats.outs_pitched}, ${stats.batters_faced}, ${stats.hits_allowed},
      ${stats.doubles_allowed}, ${stats.triples_allowed}, ${stats.home_runs_allowed},
      ${stats.runs_allowed}, ${stats.earned_runs}, ${stats.walks}, ${stats.intentional_walks},
      ${stats.strikeouts}, ${stats.hit_batters}, ${stats.wild_pitches}, ${stats.balks},
      ${stats.sacrifice_hits_allowed}, ${stats.sacrifice_flies_allowed},
      ${stats.stolen_bases_allowed}, ${stats.caught_stealing},
      ${stats.won}, ${stats.lost}, ${stats.saved},
      ${stats.game_started}, ${stats.game_finished}, ${stats.complete_game},
      ${stats.team_won}, ${stats.team_lost}, ${stats.team_tied},
      ${stats.stat_type}, ${stats.pitching_seq}
    )
    ON CONFLICT (game_id, player_id, stat_type) DO UPDATE SET
      team_id = EXCLUDED.team_id,
      is_home = EXCLUDED.is_home,
      opponent_id = EXCLUDED.opponent_id,
      outs_pitched = EXCLUDED.outs_pitched,
      batters_faced = EXCLUDED.batters_faced,
      hits_allowed = EXCLUDED.hits_allowed,
      doubles_allowed = EXCLUDED.doubles_allowed,
      triples_allowed = EXCLUDED.triples_allowed,
      home_runs_allowed = EXCLUDED.home_runs_allowed,
      runs_allowed = EXCLUDED.runs_allowed,
      earned_runs = EXCLUDED.earned_runs,
      walks = EXCLUDED.walks,
      intentional_walks = EXCLUDED.intentional_walks,
      strikeouts = EXCLUDED.strikeouts,
      hit_batters = EXCLUDED.hit_batters,
      wild_pitches = EXCLUDED.wild_pitches,
      balks = EXCLUDED.balks,
      sacrifice_hits_allowed = EXCLUDED.sacrifice_hits_allowed,
      sacrifice_flies_allowed = EXCLUDED.sacrifice_flies_allowed,
      stolen_bases_allowed = EXCLUDED.stolen_bases_allowed,
      caught_stealing = EXCLUDED.caught_stealing,
      won = EXCLUDED.won,
      lost = EXCLUDED.lost,
      saved = EXCLUDED.saved,
      game_started = EXCLUDED.game_started,
      game_finished = EXCLUDED.game_finished,
      complete_game = EXCLUDED.complete_game,
      team_won = EXCLUDED.team_won,
      team_lost = EXCLUDED.team_lost,
      team_tied = EXCLUDED.team_tied,
      pitching_seq = EXCLUDED.pitching_seq
  `;
}

/**
 * Get batter stats for a player
 */
export async function getBatterStatsByPlayer(
  sql: Sql,
  playerId: string,
  year?: number
): Promise<BatterGameStats[]> {
  if (year) {
    return sql<BatterGameStats[]>`
      SELECT bs.* FROM batter_game_stats bs
      JOIN games g ON bs.game_id = g.game_id
      WHERE bs.player_id = ${playerId}
        AND EXTRACT(YEAR FROM g.game_date) = ${year}
      ORDER BY g.game_date
    `;
  }
  return sql<BatterGameStats[]>`
    SELECT bs.* FROM batter_game_stats bs
    JOIN games g ON bs.game_id = g.game_id
    WHERE bs.player_id = ${playerId}
    ORDER BY g.game_date
  `;
}

/**
 * Get pitcher stats for a player
 */
export async function getPitcherStatsByPlayer(
  sql: Sql,
  playerId: string,
  year?: number
): Promise<PitcherGameStats[]> {
  if (year) {
    return sql<PitcherGameStats[]>`
      SELECT ps.* FROM pitcher_game_stats ps
      JOIN games g ON ps.game_id = g.game_id
      WHERE ps.player_id = ${playerId}
        AND EXTRACT(YEAR FROM g.game_date) = ${year}
      ORDER BY g.game_date
    `;
  }
  return sql<PitcherGameStats[]>`
    SELECT ps.* FROM pitcher_game_stats ps
    JOIN games g ON ps.game_id = g.game_id
    WHERE ps.player_id = ${playerId}
    ORDER BY g.game_date
  `;
}

/**
 * Get batter stats for a game
 */
export async function getBatterStatsByGame(sql: Sql, gameId: string): Promise<BatterGameStats[]> {
  return sql<BatterGameStats[]>`
    SELECT * FROM batter_game_stats
    WHERE game_id = ${gameId}
    ORDER BY batting_seq, player_id
  `;
}

/**
 * Get pitcher stats for a game
 */
export async function getPitcherStatsByGame(sql: Sql, gameId: string): Promise<PitcherGameStats[]> {
  return sql<PitcherGameStats[]>`
    SELECT * FROM pitcher_game_stats
    WHERE game_id = ${gameId}
    ORDER BY pitching_seq, player_id
  `;
}
