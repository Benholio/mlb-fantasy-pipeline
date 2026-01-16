import type { Sql } from '../client.js';
import type { Team } from '../../types/database.js';

/**
 * Upsert a team (insert or ignore if exists)
 */
export async function upsertTeam(sql: Sql, teamId: string): Promise<void> {
  await sql`
    INSERT INTO teams (team_id)
    VALUES (${teamId})
    ON CONFLICT (team_id) DO NOTHING
  `;
}

/**
 * Upsert multiple teams in a batch
 */
export async function upsertTeams(sql: Sql, teamIds: string[]): Promise<void> {
  if (teamIds.length === 0) return;

  const uniqueIds = [...new Set(teamIds.filter((id) => id && id.trim()))];
  if (uniqueIds.length === 0) return;

  await sql`
    INSERT INTO teams (team_id)
    SELECT unnest(${uniqueIds}::varchar[])
    ON CONFLICT (team_id) DO NOTHING
  `;
}

/**
 * Get all teams
 */
export async function getAllTeams(sql: Sql): Promise<Team[]> {
  return sql<Team[]>`SELECT * FROM teams ORDER BY team_id`;
}
