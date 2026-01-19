import type { FastifyInstance } from 'fastify';
import { getSql } from '../db/client.js';

interface PlayerSearchResult {
  player_id: string;
  name_first: string | null;
  name_last: string | null;
}

interface GameSearchResult {
  game_id: string;
  game_date: Date;
  home_team_id: string | null;
  away_team_id: string | null;
}

export async function searchRoutes(fastify: FastifyInstance) {
  // Unified search endpoint
  fastify.get<{
    Querystring: { q: string; type?: 'all' | 'players' | 'games'; limit?: string };
  }>('/', async (request, reply) => {
    const { q, type = 'all', limit = '10' } = request.query;

    if (!q || q.length < 2) {
      return reply.status(400).send({ error: 'Query must be at least 2 characters' });
    }

    const sql = getSql();
    const limitNum = Math.min(parseInt(limit, 10), 25);

    const results: {
      players?: Array<{ id: string; name: string; firstName: string | null; lastName: string | null }>;
      games?: Array<{ id: string; date: Date; homeTeam: string | null; awayTeam: string | null }>;
    } = {};

    if (type === 'all' || type === 'players') {
      const players = await sql<PlayerSearchResult[]>`
        SELECT player_id, name_first, name_last
        FROM players
        WHERE player_id ILIKE ${`%${q}%`}
          OR (name_first || ' ' || name_last) ILIKE ${`%${q}%`}
          OR name_last ILIKE ${`%${q}%`}
        ORDER BY
          CASE WHEN player_id ILIKE ${`${q}%`} THEN 0 ELSE 1 END,
          CASE WHEN name_last ILIKE ${`${q}%`} THEN 0 ELSE 1 END,
          player_id
        LIMIT ${limitNum}
      `;

      results.players = players.map((p) => ({
        id: p.player_id,
        name: p.name_first && p.name_last ? `${p.name_first} ${p.name_last}` : p.player_id,
        firstName: p.name_first,
        lastName: p.name_last,
      }));
    }

    if (type === 'all' || type === 'games') {
      // Search games by ID or date
      const games = await sql<GameSearchResult[]>`
        SELECT game_id, game_date, home_team_id, away_team_id
        FROM games
        WHERE game_id ILIKE ${`%${q}%`}
          OR TO_CHAR(game_date, 'YYYY-MM-DD') LIKE ${`%${q}%`}
        ORDER BY game_date DESC
        LIMIT ${limitNum}
      `;

      results.games = games.map((g) => ({
        id: g.game_id,
        date: g.game_date,
        homeTeam: g.home_team_id,
        awayTeam: g.away_team_id,
      }));
    }

    return results;
  });

  // Get available years
  fastify.get('/years', async () => {
    const sql = getSql();

    const years = await sql<{ year: number }[]>`
      SELECT DISTINCT EXTRACT(YEAR FROM game_date)::int as year
      FROM games
      ORDER BY year DESC
    `;

    return { years: years.map((y) => y.year) };
  });

  // Get available teams
  fastify.get('/teams', async () => {
    const sql = getSql();

    const teams = await sql<{ team_id: string }[]>`
      SELECT team_id FROM teams ORDER BY team_id
    `;

    return { teams: teams.map((t) => t.team_id) };
  });
}
