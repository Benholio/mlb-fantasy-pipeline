import postgres from 'postgres';
import type { DatabaseConfig } from '../config/index.js';
import { config } from '../config/index.js';

export type Sql = ReturnType<typeof postgres>;

let sqlInstance: Sql | null = null;

/**
 * Create a new postgres client with the given config
 */
export function createClient(dbConfig: DatabaseConfig): Sql {
  return postgres({
    host: dbConfig.host,
    port: dbConfig.port,
    user: dbConfig.user,
    password: dbConfig.password,
    database: dbConfig.database,
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
  });
}

/**
 * Get the singleton SQL client using default config
 */
export function getSql(): Sql {
  if (!sqlInstance) {
    sqlInstance = createClient(config.database);
  }
  return sqlInstance;
}

/**
 * Close the singleton SQL client
 */
export async function closeSql(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
}

/**
 * Execute a transaction
 */
export async function transaction<T>(
  sql: Sql,
  fn: (tx: Sql) => Promise<T>
): Promise<T> {
  return sql.begin(fn);
}
