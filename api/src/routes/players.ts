import type { FastifyInstance } from 'fastify';
import { getSql } from '../db/client.js';
import type { Sql } from '../db/client.js';

interface PlayerWithName {
  player_id: string;
  name_first: string | null;
  name_last: string | null;
  created_at: Date;
}

interface FantasyGamePointsRow {
  id: number;
  ruleset_id: string;
  game_id: string;
  player_id: string;
  stat_type: 'batting' | 'pitching';
  total_points: string;
  breakdown: unknown[];
  game_date: Date;
  calculated_at: Date;
}

// Query functions
async function getPlayer(sql: Sql, playerId: string): Promise<PlayerWithName | null> {
  const [player] = await sql<PlayerWithName[]>`
    SELECT player_id, name_first, name_last, created_at
    FROM players
    WHERE player_id = ${playerId}
  `;
  return player ?? null;
}

async function searchPlayers(sql: Sql, pattern: string, limit = 25): Promise<PlayerWithName[]> {
  return sql<PlayerWithName[]>`
    SELECT player_id, name_first, name_last, created_at
    FROM players
    WHERE player_id ILIKE ${`%${pattern}%`}
      OR (name_first || ' ' || name_last) ILIKE ${`%${pattern}%`}
      OR name_last ILIKE ${`%${pattern}%`}
    ORDER BY
      CASE WHEN player_id ILIKE ${`${pattern}%`} THEN 0 ELSE 1 END,
      CASE WHEN name_last ILIKE ${`${pattern}%`} THEN 0 ELSE 1 END,
      player_id
    LIMIT ${limit}
  `;
}

async function getBatterStatsByPlayer(
  sql: Sql,
  playerId: string,
  year?: number
) {
  if (year) {
    return [...await sql`
      SELECT bs.*, g.game_date
      FROM batter_game_stats bs
      JOIN games g ON bs.game_id = g.game_id
      WHERE bs.player_id = ${playerId}
        AND EXTRACT(YEAR FROM g.game_date) = ${year}
      ORDER BY g.game_date
    `];
  }
  return [...await sql`
    SELECT bs.*, g.game_date
    FROM batter_game_stats bs
    JOIN games g ON bs.game_id = g.game_id
    WHERE bs.player_id = ${playerId}
    ORDER BY g.game_date
  `];
}

async function getPitcherStatsByPlayer(
  sql: Sql,
  playerId: string,
  year?: number
) {
  if (year) {
    return [...await sql`
      SELECT ps.*, g.game_date
      FROM pitcher_game_stats ps
      JOIN games g ON ps.game_id = g.game_id
      WHERE ps.player_id = ${playerId}
        AND EXTRACT(YEAR FROM g.game_date) = ${year}
      ORDER BY g.game_date
    `];
  }
  return [...await sql`
    SELECT ps.*, g.game_date
    FROM pitcher_game_stats ps
    JOIN games g ON ps.game_id = g.game_id
    WHERE ps.player_id = ${playerId}
    ORDER BY g.game_date
  `];
}

async function getFantasyPointsByPlayer(
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

export async function playersRoutes(fastify: FastifyInstance) {
  // Search players
  fastify.get<{
    Querystring: { q: string; limit?: string };
  }>('/search', async (request, reply) => {
    const { q, limit } = request.query;

    if (!q || q.length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' });
    }

    const sql = getSql();
    const players = await searchPlayers(sql, q, limit ? parseInt(limit, 10) : 25);

    return {
      results: players.map((p) => ({
        id: p.player_id,
        name: p.name_first && p.name_last ? `${p.name_first} ${p.name_last}` : p.player_id,
        firstName: p.name_first,
        lastName: p.name_last,
      })),
    };
  });

  // Get player details
  fastify.get<{
    Params: { id: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const sql = getSql();

    const player = await getPlayer(sql, id);
    if (!player) {
      return reply.status(404).send({ error: 'Player not found' });
    }

    return {
      id: player.player_id,
      name: player.name_first && player.name_last
        ? `${player.name_first} ${player.name_last}`
        : player.player_id,
      firstName: player.name_first,
      lastName: player.name_last,
    };
  });

  // Get player batting stats
  fastify.get<{
    Params: { id: string };
    Querystring: { year?: string };
  }>('/:id/batting-stats', async (request) => {
    const { id } = request.params;
    const { year } = request.query;
    const sql = getSql();

    const stats = await getBatterStatsByPlayer(
      sql,
      id,
      year ? parseInt(year, 10) : undefined
    );

    return { playerId: id, stats };
  });

  // Get player pitching stats
  fastify.get<{
    Params: { id: string };
    Querystring: { year?: string };
  }>('/:id/pitching-stats', async (request) => {
    const { id } = request.params;
    const { year } = request.query;
    const sql = getSql();

    const stats = await getPitcherStatsByPlayer(
      sql,
      id,
      year ? parseInt(year, 10) : undefined
    );

    return { playerId: id, stats };
  });

  // Get player fantasy points
  fastify.get<{
    Params: { id: string };
    Querystring: { ruleset: string; year?: string };
  }>('/:id/fantasy-points', async (request, reply) => {
    const { id } = request.params;
    const { ruleset, year } = request.query;

    if (!ruleset) {
      return reply.status(400).send({ error: 'Ruleset is required' });
    }

    const sql = getSql();
    const points = await getFantasyPointsByPlayer(
      sql,
      ruleset,
      id,
      year ? parseInt(year, 10) : undefined
    );

    // Calculate summary
    const totalPoints = points.reduce((sum, p) => sum + parseFloat(p.total_points), 0);
    const avgPoints = points.length > 0 ? totalPoints / points.length : 0;

    return {
      playerId: id,
      rulesetId: ruleset,
      summary: {
        games: points.length,
        totalPoints: totalPoints.toFixed(2),
        avgPoints: avgPoints.toFixed(2),
      },
      gameLog: points.map((p) => ({
        gameId: p.game_id,
        date: p.game_date,
        statType: p.stat_type,
        points: parseFloat(p.total_points).toFixed(2),
        breakdown: p.breakdown,
      })),
    };
  });
}
