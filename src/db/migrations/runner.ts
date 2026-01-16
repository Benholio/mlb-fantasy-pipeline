import { readdir, readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { getSql, closeSql, type Sql } from '../client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

interface Migration {
  id: number;
  name: string;
  executed_at: Date;
}

/**
 * Run all pending migrations
 */
export async function runMigrations(sql?: Sql): Promise<void> {
  const client = sql ?? getSql();
  const shouldClose = !sql;

  try {
    // Ensure migrations tracking table exists
    await client`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        executed_at TIMESTAMPTZ DEFAULT NOW()
      )
    `;

    // Get already executed migrations
    const executed = await client<Migration[]>`
      SELECT * FROM migrations ORDER BY id
    `;
    const executedNames = new Set(executed.map((m) => m.name));

    // Get migration files
    const files = await readdir(__dirname);
    const sqlFiles = files.filter((f) => f.endsWith('.sql')).sort();

    // Run pending migrations
    for (const file of sqlFiles) {
      if (executedNames.has(file)) {
        console.log(`Skipping ${file} (already executed)`);
        continue;
      }

      console.log(`Running migration: ${file}`);
      const content = await readFile(join(__dirname, file), 'utf-8');

      await client.begin(async (tx) => {
        await tx.unsafe(content);
        await tx`INSERT INTO migrations (name) VALUES (${file})`;
      });

      console.log(`Completed: ${file}`);
    }

    console.log('All migrations completed.');
  } finally {
    if (shouldClose) {
      await closeSql();
    }
  }
}

// Run if executed directly
const isMainModule = process.argv[1]?.includes('runner');
if (isMainModule) {
  runMigrations()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('Migration failed:', err);
      process.exit(1);
    });
}
