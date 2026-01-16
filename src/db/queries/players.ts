import type { Sql } from '../client.js';
import type { Player } from '../../types/database.js';

/**
 * Upsert a player (insert or ignore if exists)
 */
export async function upsertPlayer(sql: Sql, playerId: string): Promise<void> {
  await sql`
    INSERT INTO players (player_id)
    VALUES (${playerId})
    ON CONFLICT (player_id) DO NOTHING
  `;
}

/**
 * Upsert multiple players in a batch
 */
export async function upsertPlayers(sql: Sql, playerIds: string[]): Promise<void> {
  if (playerIds.length === 0) return;

  const uniqueIds = [...new Set(playerIds)];
  await sql`
    INSERT INTO players (player_id)
    SELECT unnest(${uniqueIds}::varchar[])
    ON CONFLICT (player_id) DO NOTHING
  `;
}

/**
 * Get a player by ID
 */
export async function getPlayer(sql: Sql, playerId: string): Promise<Player | null> {
  const [player] = await sql<Player[]>`
    SELECT * FROM players WHERE player_id = ${playerId}
  `;
  return player ?? null;
}

/**
 * Search players by ID pattern
 */
export async function searchPlayers(sql: Sql, pattern: string, limit = 25): Promise<Player[]> {
  return sql<Player[]>`
    SELECT * FROM players
    WHERE player_id ILIKE ${`%${pattern}%`}
    ORDER BY player_id
    LIMIT ${limit}
  `;
}
