import type { FastifyInstance } from 'fastify';
import { getSql } from '../db/client.js';
import type { Sql } from '../db/client.js';

interface Game {
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

async function getGame(sql: Sql, gameId: string): Promise<Game | null> {
  const [game] = await sql<Game[]>`
    SELECT * FROM games WHERE game_id = ${gameId}
  `;
  return game ?? null;
}

async function getGamesByDateRange(
  sql: Sql,
  startDate: string,
  endDate: string
): Promise<Game[]> {
  return sql<Game[]>`
    SELECT * FROM games
    WHERE game_date >= ${startDate}::date
      AND game_date <= ${endDate}::date
    ORDER BY game_date, game_id
  `;
}

async function getGamesByYear(sql: Sql, year: number): Promise<Game[]> {
  return sql<Game[]>`
    SELECT * FROM games
    WHERE EXTRACT(YEAR FROM game_date) = ${year}
    ORDER BY game_date, game_id
  `;
}

async function getBatterStatsByGame(sql: Sql, gameId: string) {
  return [...await sql`
    SELECT bs.*,
      CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name
    FROM batter_game_stats bs
    LEFT JOIN players p ON bs.player_id = p.player_id
    WHERE bs.game_id = ${gameId}
    ORDER BY bs.is_home DESC, bs.lineup_position, bs.batting_seq
  `];
}

async function getPitcherStatsByGame(sql: Sql, gameId: string) {
  return [...await sql`
    SELECT ps.*,
      CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name
    FROM pitcher_game_stats ps
    LEFT JOIN players p ON ps.player_id = p.player_id
    WHERE ps.game_id = ${gameId}
    ORDER BY ps.is_home DESC, ps.pitching_seq
  `];
}

async function getFantasyPointsByGame(
  sql: Sql,
  rulesetId: string,
  gameId: string
) {
  return [...await sql`
    SELECT fgp.*,
      CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name
    FROM fantasy_game_points fgp
    LEFT JOIN players p ON fgp.player_id = p.player_id
    WHERE fgp.ruleset_id = ${rulesetId}
      AND fgp.game_id = ${gameId}
    ORDER BY fgp.total_points DESC
  `];
}

export async function gamesRoutes(fastify: FastifyInstance) {
  // Get game details
  fastify.get<{
    Params: { id: string };
    Querystring: { ruleset?: string };
  }>('/:id', async (request, reply) => {
    const { id } = request.params;
    const { ruleset } = request.query;
    const sql = getSql();

    const game = await getGame(sql, id);
    if (!game) {
      return reply.status(404).send({ error: 'Game not found' });
    }

    const [battingStats, pitchingStats] = await Promise.all([
      getBatterStatsByGame(sql, id),
      getPitcherStatsByGame(sql, id),
    ]);

    let fantasyPoints: unknown[] = [];
    if (ruleset) {
      fantasyPoints = await getFantasyPointsByGame(sql, ruleset, id);
    }

    return {
      id: game.game_id,
      date: game.game_date,
      gameNumber: game.game_number,
      site: game.site,
      homeTeam: game.home_team_id,
      awayTeam: game.away_team_id,
      gameType: game.game_type,
      hasBox: game.has_box,
      hasPbp: game.has_pbp,
      battingStats,
      pitchingStats,
      fantasyPoints: ruleset ? fantasyPoints : undefined,
    };
  });

  // Get games by date/range/year
  fastify.get<{
    Querystring: {
      date?: string;
      start?: string;
      end?: string;
      year?: string;
      limit?: string;
    };
  }>('/', async (request, reply) => {
    const { date, start, end, year, limit } = request.query;
    const sql = getSql();

    let games: Game[] = [];

    if (date) {
      games = await getGamesByDateRange(sql, date, date);
    } else if (start && end) {
      games = await getGamesByDateRange(sql, start, end);
    } else if (year) {
      games = await getGamesByYear(sql, parseInt(year, 10));
    } else {
      return reply.status(400).send({
        error: 'Must specify date, start/end range, or year',
      });
    }

    const maxLimit = limit ? Math.min(parseInt(limit, 10), 1000) : 100;
    const limited = games.slice(0, maxLimit);

    return {
      total: games.length,
      returned: limited.length,
      games: limited.map((g) => ({
        id: g.game_id,
        date: g.game_date,
        gameNumber: g.game_number,
        homeTeam: g.home_team_id,
        awayTeam: g.away_team_id,
        site: g.site,
      })),
    };
  });
}
