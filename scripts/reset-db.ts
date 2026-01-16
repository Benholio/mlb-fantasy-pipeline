/**
 * Reset the database by dropping and recreating all tables
 */

import { getSql, closeSql } from '../src/db/client.js';
import { runMigrations } from '../src/db/migrations/runner.js';

async function resetDatabase() {
  const sql = getSql();

  try {
    console.log('Dropping all tables...');

    // Drop tables in reverse dependency order
    await sql`DROP TABLE IF EXISTS fantasy_game_points CASCADE`;
    await sql`DROP TABLE IF EXISTS fantasy_rulesets CASCADE`;
    await sql`DROP TABLE IF EXISTS batter_game_stats CASCADE`;
    await sql`DROP TABLE IF EXISTS pitcher_game_stats CASCADE`;
    await sql`DROP TABLE IF EXISTS games CASCADE`;
    await sql`DROP TABLE IF EXISTS players CASCADE`;
    await sql`DROP TABLE IF EXISTS teams CASCADE`;
    await sql`DROP TABLE IF EXISTS staging_batting CASCADE`;
    await sql`DROP TABLE IF EXISTS staging_pitching CASCADE`;
    await sql`DROP TABLE IF EXISTS ingestion_batches CASCADE`;
    await sql`DROP TABLE IF EXISTS migrations CASCADE`;

    console.log('All tables dropped.');
    console.log('Running migrations...');

    await runMigrations(sql);

    console.log('Database reset complete!');
  } finally {
    await closeSql();
  }
}

resetDatabase().catch((err) => {
  console.error('Reset failed:', err);
  process.exit(1);
});
