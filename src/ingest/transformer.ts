import type { Sql } from '../db/client.js';
import { upsertPlayers } from '../db/queries/players.js';
import { upsertTeams } from '../db/queries/teams.js';
import { upsertGame, type GameInsert } from '../db/queries/games.js';
import {
  upsertBatterStats,
  upsertPitcherStats,
  type BatterStatsInsert,
  type PitcherStatsInsert,
} from '../db/queries/stats.js';
import type { DataType } from './downloader.js';

const TRANSFORM_BATCH_SIZE = 500;

/**
 * Parse a string to a number, returning 0 for empty/invalid values
 */
function parseNum(val: string | undefined | null): number {
  if (!val || val.trim() === '') return 0;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Parse a string to a boolean
 */
function parseBool(val: string | undefined | null): boolean {
  if (!val || val.trim() === '') return false;
  return val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'y';
}

/**
 * Parse a nullable number
 */
function parseNullableNum(val: string | undefined | null): number | null {
  if (!val || val.trim() === '') return null;
  const parsed = parseInt(val, 10);
  return isNaN(parsed) ? null : parsed;
}

/**
 * Parse a nullable boolean
 */
function parseNullableBool(val: string | undefined | null): boolean | null {
  if (!val || val.trim() === '') return null;
  return val === '1' || val.toLowerCase() === 'true' || val.toLowerCase() === 'y';
}

interface StagingBattingRow {
  id: number;
  gid: string;
  player_id: string;
  team: string;
  game_date: string;
  game_number: string;
  site: string;
  vishome: string;
  opp: string;
  b_pa: string;
  b_ab: string;
  b_r: string;
  b_h: string;
  b_d: string;
  b_t: string;
  b_hr: string;
  b_rbi: string;
  b_sh: string;
  b_sf: string;
  b_hbp: string;
  b_w: string;
  b_iw: string;
  b_k: string;
  b_sb: string;
  b_cs: string;
  b_gdp: string;
  b_xi: string;
  b_roe: string;
  dh: string;
  ph: string;
  pr: string;
  win: string;
  loss: string;
  tie: string;
  gametype: string;
  box: string;
  pbp: string;
  stattype: string;
  b_lp: string;
  b_seq: string;
}

interface StagingPitchingRow {
  id: number;
  gid: string;
  player_id: string;
  team: string;
  game_date: string;
  game_number: string;
  site: string;
  vishome: string;
  opp: string;
  p_ipouts: string;
  p_noout: string;
  p_bfp: string;
  p_h: string;
  p_d: string;
  p_t: string;
  p_hr: string;
  p_r: string;
  p_er: string;
  p_w: string;
  p_iw: string;
  p_k: string;
  p_hbp: string;
  p_wp: string;
  p_bk: string;
  p_sh: string;
  p_sf: string;
  p_sb: string;
  p_cs: string;
  p_pb: string;
  wp: string;
  lp: string;
  save_flag: string;
  gs: string;
  gf: string;
  cg: string;
  win: string;
  loss: string;
  tie: string;
  gametype: string;
  box: string;
  pbp: string;
  stattype: string;
  p_seq: string;
}

export interface TransformResult {
  processedRows: number;
  gamesCreated: number;
  playersCreated: number;
  teamsCreated: number;
}

/**
 * Transform staging batting data to typed tables
 */
export async function transformBattingData(
  sql: Sql,
  batchId: string
): Promise<TransformResult> {
  let processedRows = 0;
  const games = new Map<string, GameInsert>();
  const players = new Set<string>();
  const teams = new Set<string>();

  // Process in batches
  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const rows = await sql<StagingBattingRow[]>`
      SELECT * FROM staging_batting
      WHERE batch_id = ${batchId}::uuid
        AND processed = false
      ORDER BY id
      LIMIT ${TRANSFORM_BATCH_SIZE}
      OFFSET ${offset}
    `;

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    // Collect unique entities
    for (const row of rows) {
      if (row.player_id) players.add(row.player_id);
      if (row.team) teams.add(row.team);
      if (row.opp) teams.add(row.opp);

      if (row.gid && !games.has(row.gid)) {
        // Determine home/away teams from this row
        const isHome = row.vishome?.toUpperCase() === 'H';
        const homeTeam = isHome ? row.team : row.opp;
        const awayTeam = isHome ? row.opp : row.team;

        games.set(row.gid, {
          game_id: row.gid,
          game_date: row.game_date,
          game_number: parseNum(row.game_number),
          site: row.site || null,
          home_team_id: homeTeam || null,
          away_team_id: awayTeam || null,
          game_type: row.gametype || null,
          has_box: parseBool(row.box),
          has_pbp: row.pbp === 'y' || row.pbp === 'd',
        });
      }
    }

    // Upsert teams first (foreign key dependency)
    await upsertTeams(sql, Array.from(teams));

    // Upsert players
    await upsertPlayers(sql, Array.from(players));

    // Upsert games
    for (const game of games.values()) {
      await upsertGame(sql, game);
    }

    // Insert batter stats
    for (const row of rows) {
      if (!row.gid || !row.player_id || !row.team) continue;

      const stats: BatterStatsInsert = {
        game_id: row.gid,
        player_id: row.player_id,
        team_id: row.team,
        is_home: row.vishome?.toUpperCase() === 'H',
        opponent_id: row.opp || null,
        plate_appearances: parseNum(row.b_pa),
        at_bats: parseNum(row.b_ab),
        runs: parseNum(row.b_r),
        hits: parseNum(row.b_h),
        doubles: parseNum(row.b_d),
        triples: parseNum(row.b_t),
        home_runs: parseNum(row.b_hr),
        runs_batted_in: parseNum(row.b_rbi),
        sacrifice_hits: parseNum(row.b_sh),
        sacrifice_flies: parseNum(row.b_sf),
        hit_by_pitch: parseNum(row.b_hbp),
        walks: parseNum(row.b_w),
        intentional_walks: parseNum(row.b_iw),
        strikeouts: parseNum(row.b_k),
        stolen_bases: parseNum(row.b_sb),
        caught_stealing: parseNum(row.b_cs),
        grounded_into_dp: parseNum(row.b_gdp),
        reached_on_interference: parseNum(row.b_xi),
        reached_on_error: parseNum(row.b_roe),
        is_dh: parseBool(row.dh),
        is_ph: parseBool(row.ph),
        is_pr: parseBool(row.pr),
        team_won: parseNullableBool(row.win),
        team_lost: parseNullableBool(row.loss),
        team_tied: parseNullableBool(row.tie),
        stat_type: row.stattype || null,
        lineup_position: parseNullableNum(row.b_lp),
        batting_seq: parseNullableNum(row.b_seq),
      };

      await upsertBatterStats(sql, stats);
      processedRows++;
    }

    // Mark rows as processed
    const rowIds = rows.map((r) => r.id);
    await sql`
      UPDATE staging_batting
      SET processed = true
      WHERE id = ANY(${rowIds}::int[])
    `;

    offset += rows.length;
  }

  return {
    processedRows,
    gamesCreated: games.size,
    playersCreated: players.size,
    teamsCreated: teams.size,
  };
}

/**
 * Transform staging pitching data to typed tables
 */
export async function transformPitchingData(
  sql: Sql,
  batchId: string
): Promise<TransformResult> {
  let processedRows = 0;
  const games = new Map<string, GameInsert>();
  const players = new Set<string>();
  const teams = new Set<string>();

  let offset = 0;
  let hasMore = true;

  while (hasMore) {
    const rows = await sql<StagingPitchingRow[]>`
      SELECT * FROM staging_pitching
      WHERE batch_id = ${batchId}::uuid
        AND processed = false
      ORDER BY id
      LIMIT ${TRANSFORM_BATCH_SIZE}
      OFFSET ${offset}
    `;

    if (rows.length === 0) {
      hasMore = false;
      break;
    }

    // Collect unique entities
    for (const row of rows) {
      if (row.player_id) players.add(row.player_id);
      if (row.team) teams.add(row.team);
      if (row.opp) teams.add(row.opp);

      if (row.gid && !games.has(row.gid)) {
        const isHome = row.vishome?.toUpperCase() === 'H';
        const homeTeam = isHome ? row.team : row.opp;
        const awayTeam = isHome ? row.opp : row.team;

        games.set(row.gid, {
          game_id: row.gid,
          game_date: row.game_date,
          game_number: parseNum(row.game_number),
          site: row.site || null,
          home_team_id: homeTeam || null,
          away_team_id: awayTeam || null,
          game_type: row.gametype || null,
          has_box: parseBool(row.box),
          has_pbp: row.pbp === 'y' || row.pbp === 'd',
        });
      }
    }

    // Upsert teams first
    await upsertTeams(sql, Array.from(teams));

    // Upsert players
    await upsertPlayers(sql, Array.from(players));

    // Upsert games
    for (const game of games.values()) {
      await upsertGame(sql, game);
    }

    // Insert pitcher stats
    for (const row of rows) {
      if (!row.gid || !row.player_id || !row.team) continue;

      const stats: PitcherStatsInsert = {
        game_id: row.gid,
        player_id: row.player_id,
        team_id: row.team,
        is_home: row.vishome?.toUpperCase() === 'H',
        opponent_id: row.opp || null,
        outs_pitched: parseNum(row.p_ipouts),
        batters_faced: parseNum(row.p_bfp),
        hits_allowed: parseNum(row.p_h),
        doubles_allowed: parseNum(row.p_d),
        triples_allowed: parseNum(row.p_t),
        home_runs_allowed: parseNum(row.p_hr),
        runs_allowed: parseNum(row.p_r),
        earned_runs: parseNum(row.p_er),
        walks: parseNum(row.p_w),
        intentional_walks: parseNum(row.p_iw),
        strikeouts: parseNum(row.p_k),
        hit_batters: parseNum(row.p_hbp),
        wild_pitches: parseNum(row.p_wp),
        balks: parseNum(row.p_bk),
        sacrifice_hits_allowed: parseNum(row.p_sh),
        sacrifice_flies_allowed: parseNum(row.p_sf),
        stolen_bases_allowed: parseNum(row.p_sb),
        caught_stealing: parseNum(row.p_cs),
        won: parseBool(row.wp),
        lost: parseBool(row.lp),
        saved: parseBool(row.save_flag),
        game_started: parseBool(row.gs),
        game_finished: parseBool(row.gf),
        complete_game: parseBool(row.cg),
        team_won: parseNullableBool(row.win),
        team_lost: parseNullableBool(row.loss),
        team_tied: parseNullableBool(row.tie),
        stat_type: row.stattype || null,
        pitching_seq: parseNullableNum(row.p_seq),
      };

      await upsertPitcherStats(sql, stats);
      processedRows++;
    }

    // Mark rows as processed
    const rowIds = rows.map((r) => r.id);
    await sql`
      UPDATE staging_pitching
      SET processed = true
      WHERE id = ANY(${rowIds}::int[])
    `;

    offset += rows.length;
  }

  return {
    processedRows,
    gamesCreated: games.size,
    playersCreated: players.size,
    teamsCreated: teams.size,
  };
}

/**
 * Transform staging data based on type
 */
export async function transformData(
  sql: Sql,
  type: DataType,
  batchId: string
): Promise<TransformResult> {
  if (type === 'batting') {
    return transformBattingData(sql, batchId);
  } else {
    return transformPitchingData(sql, batchId);
  }
}
