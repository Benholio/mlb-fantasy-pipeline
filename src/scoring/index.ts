import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import type { Sql } from '../db/client.js';
import {
  getRuleset,
  upsertRuleset,
  upsertFantasyGamePoints,
  type FantasyGamePointsInsert,
} from '../db/queries/fantasy.js';
import { getBatterStatsByGame, getPitcherStatsByGame } from '../db/queries/stats.js';
import { getGame } from '../db/queries/games.js';
import { calculateBattingPoints, calculatePitchingPoints } from './calculator.js';
import { FantasyRulesetSchema, type FantasyRuleset } from '../types/fantasy.js';

export { calculateBattingPoints, calculatePitchingPoints } from './calculator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Load a preset ruleset from JSON file
 */
export async function loadPresetRuleset(presetName: string): Promise<FantasyRuleset> {
  const filePath = join(__dirname, 'presets', `${presetName}.json`);
  const content = await readFile(filePath, 'utf-8');
  const data = JSON.parse(content);
  return FantasyRulesetSchema.parse(data);
}

/**
 * Get or load a ruleset
 */
export async function getOrLoadRuleset(
  sql: Sql,
  rulesetId: string
): Promise<FantasyRuleset | null> {
  // First try to get from database
  let ruleset = await getRuleset(sql, rulesetId);

  // If not found, try to load from presets
  if (!ruleset) {
    try {
      ruleset = await loadPresetRuleset(rulesetId);
      // Save to database for future use
      await upsertRuleset(sql, ruleset);
    } catch {
      return null;
    }
  }

  return ruleset;
}

/**
 * Seed the standard ruleset to the database
 */
export async function seedStandardRuleset(sql: Sql): Promise<void> {
  const ruleset = await loadPresetRuleset('standard');
  await upsertRuleset(sql, ruleset);
}

export interface ScoreGameResult {
  gameId: string;
  battingScores: number;
  pitchingScores: number;
}

/**
 * Score all players in a game
 */
export async function scoreGame(
  sql: Sql,
  ruleset: FantasyRuleset,
  gameId: string
): Promise<ScoreGameResult> {
  const game = await getGame(sql, gameId);
  if (!game) {
    throw new Error(`Game not found: ${gameId}`);
  }

  const gameDate = game.game_date.toISOString().split('T')[0]!;
  let battingScores = 0;
  let pitchingScores = 0;

  // Score batting stats
  const batterStats = await getBatterStatsByGame(sql, gameId);
  for (const stats of batterStats) {
    const result = calculateBattingPoints(stats, ruleset);

    const pointsInsert: FantasyGamePointsInsert = {
      ruleset_id: ruleset.id,
      game_id: gameId,
      player_id: stats.player_id,
      stat_type: 'batting',
      total_points: result.totalPoints,
      breakdown: result.breakdown,
      game_date: gameDate,
    };

    await upsertFantasyGamePoints(sql, pointsInsert);
    battingScores++;
  }

  // Score pitching stats
  const pitcherStats = await getPitcherStatsByGame(sql, gameId);
  for (const stats of pitcherStats) {
    const result = calculatePitchingPoints(stats, ruleset);

    const pointsInsert: FantasyGamePointsInsert = {
      ruleset_id: ruleset.id,
      game_id: gameId,
      player_id: stats.player_id,
      stat_type: 'pitching',
      total_points: result.totalPoints,
      breakdown: result.breakdown,
      game_date: gameDate,
    };

    await upsertFantasyGamePoints(sql, pointsInsert);
    pitchingScores++;
  }

  return { gameId, battingScores, pitchingScores };
}

/**
 * Score games for a date range
 */
export async function scoreGamesForDateRange(
  sql: Sql,
  ruleset: FantasyRuleset,
  startDate: string,
  endDate: string,
  options: { force?: boolean } = {}
): Promise<{ gamesScored: number; totalBatting: number; totalPitching: number }> {
  // Get games in date range
  const games = await sql<{ game_id: string }[]>`
    SELECT game_id FROM games
    WHERE game_date >= ${startDate}::date
      AND game_date <= ${endDate}::date
    ORDER BY game_date
  `;

  let gamesScored = 0;
  let totalBatting = 0;
  let totalPitching = 0;

  for (const { game_id } of games) {
    // Check if already scored (unless force)
    if (!options.force) {
      const [existing] = await sql<{ count: string }[]>`
        SELECT COUNT(*) as count FROM fantasy_game_points
        WHERE ruleset_id = ${ruleset.id} AND game_id = ${game_id}
      `;
      if (parseInt(existing?.count ?? '0', 10) > 0) {
        continue;
      }
    }

    const result = await scoreGame(sql, ruleset, game_id);
    gamesScored++;
    totalBatting += result.battingScores;
    totalPitching += result.pitchingScores;
  }

  return { gamesScored, totalBatting, totalPitching };
}

/**
 * Score games for a year
 */
export async function scoreGamesForYear(
  sql: Sql,
  ruleset: FantasyRuleset,
  year: number,
  options: { force?: boolean } = {}
): Promise<{ gamesScored: number; totalBatting: number; totalPitching: number }> {
  return scoreGamesForDateRange(
    sql,
    ruleset,
    `${year}-01-01`,
    `${year}-12-31`,
    options
  );
}
