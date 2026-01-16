import type { Sql } from '../client.js';
import type { FantasyRuleset, PointBreakdown, ScoringRule, BonusRule } from '../../types/fantasy.js';

export interface FantasyGamePointsInsert {
  ruleset_id: string;
  game_id: string;
  player_id: string;
  stat_type: 'batting' | 'pitching';
  total_points: number;
  breakdown: PointBreakdown[];
  game_date: string;
}

export interface FantasyGamePointsRow {
  id: number;
  ruleset_id: string;
  game_id: string;
  player_id: string;
  stat_type: 'batting' | 'pitching';
  total_points: string; // DECIMAL comes as string
  breakdown: PointBreakdown[];
  game_date: Date;
  calculated_at: Date;
}

export interface LeaderboardEntry {
  player_id: string;
  games: number;
  total_points: string;
  avg_points: string;
}

/**
 * Upsert a fantasy ruleset
 */
export async function upsertRuleset(sql: Sql, ruleset: FantasyRuleset): Promise<void> {
  await sql`
    INSERT INTO fantasy_rulesets (
      ruleset_id, name, description, batting_rules, pitching_rules, bonus_rules
    ) VALUES (
      ${ruleset.id},
      ${ruleset.name},
      ${ruleset.description ?? null},
      ${sql.json(ruleset.batting)},
      ${sql.json(ruleset.pitching)},
      ${ruleset.bonuses ? sql.json(ruleset.bonuses) : null}
    )
    ON CONFLICT (ruleset_id) DO UPDATE SET
      name = EXCLUDED.name,
      description = EXCLUDED.description,
      batting_rules = EXCLUDED.batting_rules,
      pitching_rules = EXCLUDED.pitching_rules,
      bonus_rules = EXCLUDED.bonus_rules
  `;
}

/**
 * Get a ruleset by ID
 */
export async function getRuleset(sql: Sql, rulesetId: string): Promise<FantasyRuleset | null> {
  const [row] = await sql<
    {
      ruleset_id: string;
      name: string;
      description: string | null;
      batting_rules: ScoringRule[];
      pitching_rules: ScoringRule[];
      bonus_rules: BonusRule[] | null;
    }[]
  >`
    SELECT ruleset_id, name, description, batting_rules, pitching_rules, bonus_rules
    FROM fantasy_rulesets
    WHERE ruleset_id = ${rulesetId}
  `;

  if (!row) return null;

  return {
    id: row.ruleset_id,
    name: row.name,
    description: row.description ?? undefined,
    batting: row.batting_rules,
    pitching: row.pitching_rules,
    bonuses: row.bonus_rules ?? undefined,
  };
}

/**
 * Get all rulesets
 */
export async function getAllRulesets(sql: Sql): Promise<FantasyRuleset[]> {
  const rows = await sql<
    {
      ruleset_id: string;
      name: string;
      description: string | null;
      batting_rules: ScoringRule[];
      pitching_rules: ScoringRule[];
      bonus_rules: BonusRule[] | null;
    }[]
  >`
    SELECT ruleset_id, name, description, batting_rules, pitching_rules, bonus_rules
    FROM fantasy_rulesets
    ORDER BY ruleset_id
  `;

  return rows.map((row) => ({
    id: row.ruleset_id,
    name: row.name,
    description: row.description ?? undefined,
    batting: row.batting_rules,
    pitching: row.pitching_rules,
    bonuses: row.bonus_rules ?? undefined,
  }));
}

/**
 * Upsert fantasy game points
 */
export async function upsertFantasyGamePoints(
  sql: Sql,
  points: FantasyGamePointsInsert
): Promise<void> {
  await sql`
    INSERT INTO fantasy_game_points (
      ruleset_id, game_id, player_id, stat_type, total_points, breakdown, game_date
    ) VALUES (
      ${points.ruleset_id},
      ${points.game_id},
      ${points.player_id},
      ${points.stat_type},
      ${points.total_points},
      ${sql.json(points.breakdown)},
      ${points.game_date}::date
    )
    ON CONFLICT (ruleset_id, game_id, player_id, stat_type) DO UPDATE SET
      total_points = EXCLUDED.total_points,
      breakdown = EXCLUDED.breakdown,
      calculated_at = NOW()
  `;
}

/**
 * Get fantasy points for a player
 */
export async function getFantasyPointsByPlayer(
  sql: Sql,
  rulesetId: string,
  playerId: string,
  year?: number
): Promise<FantasyGamePointsRow[]> {
  if (year) {
    return sql<FantasyGamePointsRow[]>`
      SELECT * FROM fantasy_game_points
      WHERE ruleset_id = ${rulesetId}
        AND player_id = ${playerId}
        AND EXTRACT(YEAR FROM game_date) = ${year}
      ORDER BY game_date
    `;
  }
  return sql<FantasyGamePointsRow[]>`
    SELECT * FROM fantasy_game_points
    WHERE ruleset_id = ${rulesetId}
      AND player_id = ${playerId}
    ORDER BY game_date
  `;
}

/**
 * Get fantasy points for a game
 */
export async function getFantasyPointsByGame(
  sql: Sql,
  rulesetId: string,
  gameId: string
): Promise<FantasyGamePointsRow[]> {
  return sql<FantasyGamePointsRow[]>`
    SELECT * FROM fantasy_game_points
    WHERE ruleset_id = ${rulesetId}
      AND game_id = ${gameId}
    ORDER BY total_points DESC
  `;
}

/**
 * Get fantasy leaderboard
 */
export async function getFantasyLeaderboard(
  sql: Sql,
  rulesetId: string,
  options: {
    year?: number;
    statType?: 'batting' | 'pitching';
    limit?: number;
  } = {}
): Promise<LeaderboardEntry[]> {
  const { year, statType, limit = 25 } = options;

  let query = sql<LeaderboardEntry[]>`
    SELECT
      player_id,
      COUNT(*)::int as games,
      SUM(total_points)::text as total_points,
      ROUND(AVG(total_points), 2)::text as avg_points
    FROM fantasy_game_points
    WHERE ruleset_id = ${rulesetId}
  `;

  if (year) {
    query = sql<LeaderboardEntry[]>`
      SELECT
        player_id,
        COUNT(*)::int as games,
        SUM(total_points)::text as total_points,
        ROUND(AVG(total_points), 2)::text as avg_points
      FROM fantasy_game_points
      WHERE ruleset_id = ${rulesetId}
        AND EXTRACT(YEAR FROM game_date) = ${year}
        ${statType ? sql`AND stat_type = ${statType}` : sql``}
      GROUP BY player_id
      ORDER BY SUM(total_points) DESC
      LIMIT ${limit}
    `;
  } else if (statType) {
    query = sql<LeaderboardEntry[]>`
      SELECT
        player_id,
        COUNT(*)::int as games,
        SUM(total_points)::text as total_points,
        ROUND(AVG(total_points), 2)::text as avg_points
      FROM fantasy_game_points
      WHERE ruleset_id = ${rulesetId}
        AND stat_type = ${statType}
      GROUP BY player_id
      ORDER BY SUM(total_points) DESC
      LIMIT ${limit}
    `;
  } else {
    query = sql<LeaderboardEntry[]>`
      SELECT
        player_id,
        COUNT(*)::int as games,
        SUM(total_points)::text as total_points,
        ROUND(AVG(total_points), 2)::text as avg_points
      FROM fantasy_game_points
      WHERE ruleset_id = ${rulesetId}
      GROUP BY player_id
      ORDER BY SUM(total_points) DESC
      LIMIT ${limit}
    `;
  }

  return query;
}

/**
 * Check if points already exist for a batch of games
 */
export async function getExistingPointsGameIds(
  sql: Sql,
  rulesetId: string,
  gameIds: string[]
): Promise<Set<string>> {
  if (gameIds.length === 0) return new Set();

  const rows = await sql<{ game_id: string }[]>`
    SELECT DISTINCT game_id FROM fantasy_game_points
    WHERE ruleset_id = ${rulesetId}
      AND game_id = ANY(${gameIds}::varchar[])
  `;

  return new Set(rows.map((r) => r.game_id));
}
