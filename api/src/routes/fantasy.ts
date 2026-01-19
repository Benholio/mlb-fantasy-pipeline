import type { FastifyInstance } from 'fastify';
import { getSql } from '../db/client.js';
import type { Sql } from '../db/client.js';

interface ScoringRule {
  stat: string;
  points: number;
  perUnit?: number;
}

interface BonusCondition {
  stat: string;
  op: 'gte' | 'lte' | 'eq' | 'gt' | 'lt';
  value: number;
}

interface BonusRule {
  name: string;
  conditions: BonusCondition[];
  logic: 'AND' | 'OR';
  points: number;
}

interface FantasyRuleset {
  id: string;
  name: string;
  description?: string;
  batting: ScoringRule[];
  pitching: ScoringRule[];
  bonuses?: BonusRule[];
}

interface LeaderboardEntry {
  player_id: string;
  player_name: string | null;
  games: number;
  total_points: string;
  avg_points: string;
}

async function getRuleset(sql: Sql, rulesetId: string): Promise<FantasyRuleset | null> {
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

async function getAllRulesets(sql: Sql): Promise<FantasyRuleset[]> {
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

async function getFantasyLeaderboard(
  sql: Sql,
  rulesetId: string,
  options: {
    year?: number;
    statType?: 'batting' | 'pitching';
    limit?: number;
    offset?: number;
  } = {}
): Promise<{ entries: LeaderboardEntry[]; total: number }> {
  const { year, statType, limit = 25, offset = 0 } = options;

  // Build conditions
  const conditions: string[] = ['ruleset_id = $1'];
  const params: (string | number)[] = [rulesetId];
  let paramIdx = 2;

  if (year) {
    conditions.push(`EXTRACT(YEAR FROM game_date) = $${paramIdx}`);
    params.push(year);
    paramIdx++;
  }

  if (statType) {
    conditions.push(`stat_type = $${paramIdx}`);
    params.push(statType);
    paramIdx++;
  }

  const whereClause = conditions.join(' AND ');

  // Get total count
  const countResult = [...await sql.unsafe<{ count: string }[]>(
    `SELECT COUNT(DISTINCT player_id) as count FROM fantasy_game_points WHERE ${whereClause}`,
    params as (string | number)[]
  )];
  const total = parseInt(countResult[0]?.count || '0', 10);

  // Get leaderboard with pagination
  const entries = [...await sql.unsafe<LeaderboardEntry[]>(
    `SELECT
      fgp.player_id,
      CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
      COUNT(*)::int as games,
      SUM(fgp.total_points)::text as total_points,
      ROUND(AVG(fgp.total_points), 2)::text as avg_points
    FROM fantasy_game_points fgp
    LEFT JOIN players p ON fgp.player_id = p.player_id
    WHERE ${whereClause}
    GROUP BY fgp.player_id, p.name_first, p.name_last
    ORDER BY SUM(fgp.total_points) DESC
    LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
    [...params, limit, offset] as (string | number)[]
  )];

  return { entries, total };
}

interface BattingPerformance {
  player_id: string;
  player_name: string | null;
  game_id: string;
  game_date: Date;
  total_points: string;
  at_bats: number;
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  runs: number;
  runs_batted_in: number;
  walks: number;
  stolen_bases: number;
  hit_by_pitch: number;
}

interface PitchingPerformance {
  player_id: string;
  player_name: string | null;
  game_id: string;
  game_date: Date;
  total_points: string;
  outs_pitched: number;
  hits_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  walks: number;
  strikeouts: number;
  hit_batters: number;
  won: boolean;
  lost: boolean;
  saved: boolean;
  complete_game: boolean;
}

export async function fantasyRoutes(fastify: FastifyInstance) {
  // Get all rulesets
  fastify.get('/rulesets', async () => {
    const sql = getSql();
    const rulesets = await getAllRulesets(sql);

    return {
      rulesets: rulesets.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description,
      })),
    };
  });

  // Get single ruleset
  fastify.get<{
    Params: { id: string };
  }>('/rulesets/:id', async (request, reply) => {
    const { id } = request.params;
    const sql = getSql();

    const ruleset = await getRuleset(sql, id);
    if (!ruleset) {
      return reply.status(404).send({ error: 'Ruleset not found' });
    }

    return ruleset;
  });

  // Get leaderboard
  fastify.get<{
    Querystring: {
      ruleset: string;
      year?: string;
      type?: 'batting' | 'pitching';
      limit?: string;
      offset?: string;
    };
  }>('/leaderboard', async (request, reply) => {
    const { ruleset, year, type, limit, offset } = request.query;

    if (!ruleset) {
      return reply.status(400).send({ error: 'Ruleset is required' });
    }

    const sql = getSql();
    const rulesetData = await getRuleset(sql, ruleset);
    if (!rulesetData) {
      return reply.status(404).send({ error: 'Ruleset not found' });
    }

    const { entries, total } = await getFantasyLeaderboard(sql, ruleset, {
      year: year ? parseInt(year, 10) : undefined,
      statType: type,
      limit: limit ? Math.min(parseInt(limit, 10), 100) : 25,
      offset: offset ? parseInt(offset, 10) : 0,
    });

    return {
      ruleset: {
        id: rulesetData.id,
        name: rulesetData.name,
      },
      year: year ? parseInt(year, 10) : null,
      type: type || 'all',
      total,
      entries: entries.map((e, i) => ({
        rank: (offset ? parseInt(offset, 10) : 0) + i + 1,
        playerId: e.player_id,
        playerName: e.player_name || e.player_id,
        games: e.games,
        totalPoints: parseFloat(e.total_points).toFixed(2),
        avgPoints: parseFloat(e.avg_points).toFixed(2),
      })),
    };
  });

  // Get top performances
  fastify.get<{
    Querystring: {
      ruleset: string;
      date?: string;
      monthDay?: string;
      yearStart?: string;
      yearEnd?: string;
      type?: 'batting' | 'pitching' | 'both';
      limit?: string;
    };
  }>('/top', async (request, reply) => {
    const { ruleset, date, monthDay, yearStart, yearEnd, type = 'both', limit = '10' } = request.query;

    if (!ruleset) {
      return reply.status(400).send({ error: 'Ruleset is required' });
    }

    if (!date && !monthDay) {
      return reply.status(400).send({ error: 'Either date or monthDay is required' });
    }

    const sql = getSql();
    const rulesetData = await getRuleset(sql, ruleset);
    if (!rulesetData) {
      return reply.status(404).send({ error: 'Ruleset not found' });
    }

    const limitNum = Math.min(parseInt(limit, 10), 50);
    const showBatting = type === 'both' || type === 'batting';
    const showPitching = type === 'both' || type === 'pitching';

    let battingResults: BattingPerformance[] = [];
    let pitchingResults: PitchingPerformance[] = [];

    if (monthDay) {
      const match = monthDay.match(/^(\d{1,2})-(\d{1,2})$/);
      if (!match) {
        return reply.status(400).send({ error: 'Invalid monthDay format. Use MM-DD' });
      }

      const month = parseInt(match[1]!, 10);
      const day = parseInt(match[2]!, 10);
      const yearStartNum = yearStart ? parseInt(yearStart, 10) : null;
      const yearEndNum = yearEnd ? parseInt(yearEnd, 10) : null;

      if (showBatting) {
        battingResults = await sql<BattingPerformance[]>`
          SELECT
            fgp.player_id,
            CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
            fgp.game_id,
            fgp.game_date,
            fgp.total_points,
            bgs.at_bats,
            bgs.hits,
            bgs.doubles,
            bgs.triples,
            bgs.home_runs,
            bgs.runs,
            bgs.runs_batted_in,
            bgs.walks,
            bgs.stolen_bases,
            bgs.hit_by_pitch
          FROM fantasy_game_points fgp
          JOIN batter_game_stats bgs ON fgp.game_id = bgs.game_id AND fgp.player_id = bgs.player_id
          LEFT JOIN players p ON fgp.player_id = p.player_id
          WHERE fgp.ruleset_id = ${ruleset}
            AND EXTRACT(MONTH FROM fgp.game_date) = ${month}
            AND EXTRACT(DAY FROM fgp.game_date) = ${day}
            AND fgp.stat_type = 'batting'
            ${yearStartNum !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) >= ${yearStartNum}` : sql``}
            ${yearEndNum !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) <= ${yearEndNum}` : sql``}
          ORDER BY fgp.total_points DESC
          LIMIT ${limitNum}
        `;
      }

      if (showPitching) {
        pitchingResults = await sql<PitchingPerformance[]>`
          SELECT
            fgp.player_id,
            CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
            fgp.game_id,
            fgp.game_date,
            fgp.total_points,
            pgs.outs_pitched,
            pgs.hits_allowed,
            pgs.runs_allowed,
            pgs.earned_runs,
            pgs.walks,
            pgs.strikeouts,
            pgs.hit_batters,
            pgs.won,
            pgs.lost,
            pgs.saved,
            pgs.complete_game
          FROM fantasy_game_points fgp
          JOIN pitcher_game_stats pgs ON fgp.game_id = pgs.game_id AND fgp.player_id = pgs.player_id
          LEFT JOIN players p ON fgp.player_id = p.player_id
          WHERE fgp.ruleset_id = ${ruleset}
            AND EXTRACT(MONTH FROM fgp.game_date) = ${month}
            AND EXTRACT(DAY FROM fgp.game_date) = ${day}
            AND fgp.stat_type = 'pitching'
            ${yearStartNum !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) >= ${yearStartNum}` : sql``}
            ${yearEndNum !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) <= ${yearEndNum}` : sql``}
          ORDER BY fgp.total_points DESC
          LIMIT ${limitNum}
        `;
      }
    } else if (date) {
      if (showBatting) {
        battingResults = await sql<BattingPerformance[]>`
          SELECT
            fgp.player_id,
            CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
            fgp.game_id,
            fgp.game_date,
            fgp.total_points,
            bgs.at_bats,
            bgs.hits,
            bgs.doubles,
            bgs.triples,
            bgs.home_runs,
            bgs.runs,
            bgs.runs_batted_in,
            bgs.walks,
            bgs.stolen_bases,
            bgs.hit_by_pitch
          FROM fantasy_game_points fgp
          JOIN batter_game_stats bgs ON fgp.game_id = bgs.game_id AND fgp.player_id = bgs.player_id
          LEFT JOIN players p ON fgp.player_id = p.player_id
          WHERE fgp.ruleset_id = ${ruleset}
            AND fgp.game_date = ${date}::date
            AND fgp.stat_type = 'batting'
          ORDER BY fgp.total_points DESC
          LIMIT ${limitNum}
        `;
      }

      if (showPitching) {
        pitchingResults = await sql<PitchingPerformance[]>`
          SELECT
            fgp.player_id,
            CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
            fgp.game_id,
            fgp.game_date,
            fgp.total_points,
            pgs.outs_pitched,
            pgs.hits_allowed,
            pgs.runs_allowed,
            pgs.earned_runs,
            pgs.walks,
            pgs.strikeouts,
            pgs.hit_batters,
            pgs.won,
            pgs.lost,
            pgs.saved,
            pgs.complete_game
          FROM fantasy_game_points fgp
          JOIN pitcher_game_stats pgs ON fgp.game_id = pgs.game_id AND fgp.player_id = pgs.player_id
          LEFT JOIN players p ON fgp.player_id = p.player_id
          WHERE fgp.ruleset_id = ${ruleset}
            AND fgp.game_date = ${date}::date
            AND fgp.stat_type = 'pitching'
          ORDER BY fgp.total_points DESC
          LIMIT ${limitNum}
        `;
      }
    }

    return {
      ruleset: {
        id: rulesetData.id,
        name: rulesetData.name,
      },
      query: {
        date,
        monthDay,
        yearStart: yearStart ? parseInt(yearStart, 10) : null,
        yearEnd: yearEnd ? parseInt(yearEnd, 10) : null,
        type,
      },
      batting: battingResults.map((r) => ({
        playerId: r.player_id,
        playerName: r.player_name || r.player_id,
        gameId: r.game_id,
        date: r.game_date,
        points: parseFloat(r.total_points).toFixed(2),
        stats: {
          atBats: r.at_bats,
          hits: r.hits,
          doubles: r.doubles,
          triples: r.triples,
          homeRuns: r.home_runs,
          runs: r.runs,
          rbi: r.runs_batted_in,
          walks: r.walks,
          stolenBases: r.stolen_bases,
          hitByPitch: r.hit_by_pitch,
        },
      })),
      pitching: pitchingResults.map((r) => ({
        playerId: r.player_id,
        playerName: r.player_name || r.player_id,
        gameId: r.game_id,
        date: r.game_date,
        points: parseFloat(r.total_points).toFixed(2),
        stats: {
          inningsPitched: (r.outs_pitched / 3).toFixed(1),
          hitsAllowed: r.hits_allowed,
          runsAllowed: r.runs_allowed,
          earnedRuns: r.earned_runs,
          walks: r.walks,
          strikeouts: r.strikeouts,
          hitBatters: r.hit_batters,
          win: r.won,
          loss: r.lost,
          save: r.saved,
          completeGame: r.complete_game,
        },
      })),
    };
  });
}
