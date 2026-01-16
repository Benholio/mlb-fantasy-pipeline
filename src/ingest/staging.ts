import { randomUUID } from 'crypto';
import type { Sql } from '../db/client.js';
import { streamParseCSV } from './parser.js';
import type { RawBattingRow, RawPitchingRow, RawPlayingRow } from '../types/retrosplits.js';
import { toBattingRow, toPitchingRow, hasBattingStats, hasPitchingStats } from '../types/retrosplits.js';
import type { DataType } from './downloader.js';

const BATCH_SIZE = 1000;

export interface StagingResult {
  batchId: string;
  totalRows: number;
  sourceFile: string;
}

/**
 * Load batting CSV to staging table
 */
export async function loadBattingToStaging(
  sql: Sql,
  filePath: string,
  sourceFile: string
): Promise<StagingResult> {
  const batchId = randomUUID();
  let totalRows = 0;
  let batch: RawBattingRow[] = [];

  const insertBatch = async () => {
    if (batch.length === 0) return;

    await sql`
      INSERT INTO staging_batting (
        batch_id, source_file, row_num,
        gid, player_id, team, game_date, game_number, site, vishome, opp,
        b_pa, b_ab, b_r, b_h, b_d, b_t, b_hr, b_rbi,
        b_sh, b_sf, b_hbp, b_w, b_iw, b_k, b_sb, b_cs, b_gdp, b_xi, b_roe,
        dh, ph, pr, win, loss, tie, gametype, box, pbp, stattype, b_lp, b_seq
      )
      SELECT
        ${batchId}::uuid,
        ${sourceFile},
        (data->>'row_num')::int,
        data->>'gid', data->>'id', data->>'team', data->>'date', data->>'number',
        data->>'site', data->>'vishome', data->>'opp',
        data->>'b_pa', data->>'b_ab', data->>'b_r', data->>'b_h',
        data->>'b_d', data->>'b_t', data->>'b_hr', data->>'b_rbi',
        data->>'b_sh', data->>'b_sf', data->>'b_hbp', data->>'b_w',
        data->>'b_iw', data->>'b_k', data->>'b_sb', data->>'b_cs',
        data->>'b_gdp', data->>'b_xi', data->>'b_roe',
        data->>'dh', data->>'ph', data->>'pr',
        data->>'win', data->>'loss', data->>'tie',
        data->>'gametype', data->>'box', data->>'pbp',
        data->>'stattype', data->>'b_lp', data->>'b_seq'
      FROM jsonb_array_elements(${sql.json(batch.map((row, i) => ({ ...row, row_num: totalRows - batch.length + i + 1 })))}) AS data
    `;

    batch = [];
  };

  for await (const { row } of streamParseCSV<RawBattingRow>(filePath)) {
    batch.push(row);
    totalRows++;

    if (batch.length >= BATCH_SIZE) {
      await insertBatch();
    }
  }

  // Insert remaining rows
  await insertBatch();

  return { batchId, totalRows, sourceFile };
}

/**
 * Load pitching CSV to staging table
 */
export async function loadPitchingToStaging(
  sql: Sql,
  filePath: string,
  sourceFile: string
): Promise<StagingResult> {
  const batchId = randomUUID();
  let totalRows = 0;
  let batch: RawPitchingRow[] = [];

  const insertBatch = async () => {
    if (batch.length === 0) return;

    await sql`
      INSERT INTO staging_pitching (
        batch_id, source_file, row_num,
        gid, player_id, team, game_date, game_number, site, vishome, opp,
        p_ipouts, p_noout, p_bfp, p_h, p_d, p_t, p_hr, p_r, p_er,
        p_w, p_iw, p_k, p_hbp, p_wp, p_bk, p_sh, p_sf, p_sb, p_cs, p_pb,
        wp, lp, save_flag, gs, gf, cg,
        win, loss, tie, gametype, box, pbp, stattype, p_seq
      )
      SELECT
        ${batchId}::uuid,
        ${sourceFile},
        (data->>'row_num')::int,
        data->>'gid', data->>'id', data->>'team', data->>'date', data->>'number',
        data->>'site', data->>'vishome', data->>'opp',
        data->>'p_ipouts', data->>'p_noout', data->>'p_bfp',
        data->>'p_h', data->>'p_d', data->>'p_t', data->>'p_hr',
        data->>'p_r', data->>'p_er', data->>'p_w', data->>'p_iw',
        data->>'p_k', data->>'p_hbp', data->>'p_wp', data->>'p_bk',
        data->>'p_sh', data->>'p_sf', data->>'p_sb', data->>'p_cs', data->>'p_pb',
        data->>'wp', data->>'lp', data->>'save',
        data->>'gs', data->>'gf', data->>'cg',
        data->>'win', data->>'loss', data->>'tie',
        data->>'gametype', data->>'box', data->>'pbp',
        data->>'stattype', data->>'p_seq'
      FROM jsonb_array_elements(${sql.json(batch.map((row, i) => ({ ...row, row_num: totalRows - batch.length + i + 1 })))}) AS data
    `;

    batch = [];
  };

  for await (const { row } of streamParseCSV<RawPitchingRow>(filePath)) {
    batch.push(row);
    totalRows++;

    if (batch.length >= BATCH_SIZE) {
      await insertBatch();
    }
  }

  await insertBatch();

  return { batchId, totalRows, sourceFile };
}

export interface UnifiedStagingResult {
  battingBatchId: string;
  pitchingBatchId: string;
  battingRows: number;
  pitchingRows: number;
  totalRows: number;
  sourceFile: string;
}

/**
 * Load a unified playing CSV file to both staging tables
 * The playing file contains both batting and pitching stats in each row
 */
export async function loadPlayingToStaging(
  sql: Sql,
  filePath: string,
  sourceFile: string
): Promise<UnifiedStagingResult> {
  const battingBatchId = randomUUID();
  const pitchingBatchId = randomUUID();
  let battingRows = 0;
  let pitchingRows = 0;
  let totalRows = 0;
  let battingBatch: RawBattingRow[] = [];
  let pitchingBatch: RawPitchingRow[] = [];

  const insertBattingBatch = async () => {
    if (battingBatch.length === 0) return;

    await sql`
      INSERT INTO staging_batting (
        batch_id, source_file, row_num,
        gid, player_id, team, game_date, game_number, site, vishome, opp,
        b_pa, b_ab, b_r, b_h, b_d, b_t, b_hr, b_rbi,
        b_sh, b_sf, b_hbp, b_w, b_iw, b_k, b_sb, b_cs, b_gdp, b_xi, b_roe,
        dh, ph, pr, win, loss, tie, gametype, box, pbp, stattype, b_lp, b_seq
      )
      SELECT
        ${battingBatchId}::uuid,
        ${sourceFile},
        (data->>'row_num')::int,
        data->>'gid', data->>'id', data->>'team', data->>'date', data->>'number',
        data->>'site', data->>'vishome', data->>'opp',
        data->>'b_pa', data->>'b_ab', data->>'b_r', data->>'b_h',
        data->>'b_d', data->>'b_t', data->>'b_hr', data->>'b_rbi',
        data->>'b_sh', data->>'b_sf', data->>'b_hbp', data->>'b_w',
        data->>'b_iw', data->>'b_k', data->>'b_sb', data->>'b_cs',
        data->>'b_gdp', data->>'b_xi', data->>'b_roe',
        data->>'dh', data->>'ph', data->>'pr',
        data->>'win', data->>'loss', data->>'tie',
        data->>'gametype', data->>'box', data->>'pbp',
        data->>'stattype', data->>'b_lp', data->>'b_seq'
      FROM jsonb_array_elements(${sql.json(battingBatch.map((row, i) => ({ ...row, row_num: battingRows - battingBatch.length + i + 1 })))}) AS data
    `;

    battingBatch = [];
  };

  const insertPitchingBatch = async () => {
    if (pitchingBatch.length === 0) return;

    await sql`
      INSERT INTO staging_pitching (
        batch_id, source_file, row_num,
        gid, player_id, team, game_date, game_number, site, vishome, opp,
        p_ipouts, p_noout, p_bfp, p_h, p_d, p_t, p_hr, p_r, p_er,
        p_w, p_iw, p_k, p_hbp, p_wp, p_bk, p_sh, p_sf, p_sb, p_cs, p_pb,
        wp, lp, save_flag, gs, gf, cg,
        win, loss, tie, gametype, box, pbp, stattype, p_seq
      )
      SELECT
        ${pitchingBatchId}::uuid,
        ${sourceFile},
        (data->>'row_num')::int,
        data->>'gid', data->>'id', data->>'team', data->>'date', data->>'number',
        data->>'site', data->>'vishome', data->>'opp',
        data->>'p_ipouts', data->>'p_noout', data->>'p_bfp',
        data->>'p_h', data->>'p_d', data->>'p_t', data->>'p_hr',
        data->>'p_r', data->>'p_er', data->>'p_w', data->>'p_iw',
        data->>'p_k', data->>'p_hbp', data->>'p_wp', data->>'p_bk',
        data->>'p_sh', data->>'p_sf', data->>'p_sb', data->>'p_cs', data->>'p_pb',
        data->>'wp', data->>'lp', data->>'save',
        data->>'gs', data->>'gf', data->>'cg',
        data->>'win', data->>'loss', data->>'tie',
        data->>'gametype', data->>'box', data->>'pbp',
        data->>'stattype', data->>'p_seq'
      FROM jsonb_array_elements(${sql.json(pitchingBatch.map((row, i) => ({ ...row, row_num: pitchingRows - pitchingBatch.length + i + 1 })))}) AS data
    `;

    pitchingBatch = [];
  };

  for await (const { row } of streamParseCSV<RawPlayingRow>(filePath)) {
    totalRows++;

    // Check if row has batting stats
    if (hasBattingStats(row)) {
      const battingRow = toBattingRow(row);
      battingBatch.push(battingRow);
      battingRows++;

      if (battingBatch.length >= BATCH_SIZE) {
        await insertBattingBatch();
      }
    }

    // Check if row has pitching stats
    if (hasPitchingStats(row)) {
      const pitchingRow = toPitchingRow(row);
      pitchingBatch.push(pitchingRow);
      pitchingRows++;

      if (pitchingBatch.length >= BATCH_SIZE) {
        await insertPitchingBatch();
      }
    }
  }

  // Insert remaining rows
  await insertBattingBatch();
  await insertPitchingBatch();

  return {
    battingBatchId,
    pitchingBatchId,
    battingRows,
    pitchingRows,
    totalRows,
    sourceFile,
  };
}

/**
 * @deprecated Use loadPlayingToStaging instead
 * Load a CSV file to staging
 */
export async function loadToStaging(
  sql: Sql,
  type: DataType,
  filePath: string,
  sourceFile: string
): Promise<StagingResult> {
  if (type === 'batting') {
    return loadBattingToStaging(sql, filePath, sourceFile);
  } else {
    return loadPitchingToStaging(sql, filePath, sourceFile);
  }
}

/**
 * Create an ingestion batch record
 */
export async function createIngestionBatch(
  sql: Sql,
  type: DataType,
  year: number,
  sourceFile: string
): Promise<string> {
  const [result] = await sql<{ batch_id: string }[]>`
    INSERT INTO ingestion_batches (source_type, source_file, year, status)
    VALUES (${type}, ${sourceFile}, ${year}, 'in_progress')
    RETURNING batch_id
  `;
  return result?.batch_id ?? '';
}

/**
 * Update ingestion batch status
 */
export async function updateIngestionBatch(
  sql: Sql,
  batchId: string,
  updates: {
    status?: 'pending' | 'in_progress' | 'completed' | 'failed';
    totalRows?: number;
    processedRows?: number;
    errorMessage?: string;
  }
): Promise<void> {
  if (updates.status === 'completed') {
    await sql`
      UPDATE ingestion_batches
      SET status = ${updates.status},
          total_rows = COALESCE(${updates.totalRows ?? null}, total_rows),
          processed_rows = COALESCE(${updates.processedRows ?? null}, processed_rows),
          completed_at = NOW()
      WHERE batch_id = ${batchId}::uuid
    `;
  } else if (updates.status === 'failed') {
    await sql`
      UPDATE ingestion_batches
      SET status = ${updates.status},
          error_message = ${updates.errorMessage ?? null}
      WHERE batch_id = ${batchId}::uuid
    `;
  } else {
    await sql`
      UPDATE ingestion_batches
      SET status = COALESCE(${updates.status ?? null}, status),
          total_rows = COALESCE(${updates.totalRows ?? null}, total_rows),
          processed_rows = COALESCE(${updates.processedRows ?? null}, processed_rows)
      WHERE batch_id = ${batchId}::uuid
    `;
  }
}

/**
 * Check if a year/type has already been ingested
 */
export async function hasCompletedIngestion(
  sql: Sql,
  type: DataType,
  year: number
): Promise<boolean> {
  const [result] = await sql<{ count: string }[]>`
    SELECT COUNT(*) as count FROM ingestion_batches
    WHERE source_type = ${type}
      AND year = ${year}
      AND status = 'completed'
  `;
  return parseInt(result?.count ?? '0', 10) > 0;
}

/**
 * Clear staging data for a batch
 */
export async function clearStagingBatch(
  sql: Sql,
  type: DataType,
  batchId: string
): Promise<void> {
  if (type === 'batting') {
    await sql`DELETE FROM staging_batting WHERE batch_id = ${batchId}::uuid`;
  } else {
    await sql`DELETE FROM staging_pitching WHERE batch_id = ${batchId}::uuid`;
  }
}
