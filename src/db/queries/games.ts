import type { Sql } from '../client.js';
import type { Game } from '../../types/database.js';

export interface GameInsert {
  game_id: string;
  game_date: string;
  game_number: number;
  site: string | null;
  home_team_id: string | null;
  away_team_id: string | null;
  game_type: string | null;
  has_box: boolean;
  has_pbp: boolean;
}

/**
 * Upsert a game
 */
export async function upsertGame(sql: Sql, game: GameInsert): Promise<void> {
  await sql`
    INSERT INTO games (
      game_id, game_date, game_number, site, home_team_id, away_team_id,
      game_type, has_box, has_pbp
    ) VALUES (
      ${game.game_id}, ${game.game_date}::date, ${game.game_number},
      ${game.site}, ${game.home_team_id}, ${game.away_team_id},
      ${game.game_type}, ${game.has_box}, ${game.has_pbp}
    )
    ON CONFLICT (game_id) DO UPDATE SET
      has_box = EXCLUDED.has_box OR games.has_box,
      has_pbp = EXCLUDED.has_pbp OR games.has_pbp
  `;
}

/**
 * Get a game by ID
 */
export async function getGame(sql: Sql, gameId: string): Promise<Game | null> {
  const [game] = await sql<Game[]>`
    SELECT * FROM games WHERE game_id = ${gameId}
  `;
  return game ?? null;
}

/**
 * Get games by date range
 */
export async function getGamesByDateRange(
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

/**
 * Get games for a specific year
 */
export async function getGamesByYear(sql: Sql, year: number): Promise<Game[]> {
  return sql<Game[]>`
    SELECT * FROM games
    WHERE EXTRACT(YEAR FROM game_date) = ${year}
    ORDER BY game_date, game_id
  `;
}
