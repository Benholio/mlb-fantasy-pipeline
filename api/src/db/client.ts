import postgres from 'postgres';

export type Sql = ReturnType<typeof postgres>;

let sqlInstance: Sql | null = null;

interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

function getConfig(): DatabaseConfig {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10),
    user: process.env.DB_USER || 'mlb',
    password: process.env.DB_PASSWORD || 'mlb_dev_password',
    database: process.env.DB_NAME || 'mlb_fantasy',
  };
}

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

export function createClientFromUrl(url: string): Sql {
  return postgres(url, {
    max: 10,
    idle_timeout: 20,
    connect_timeout: 10,
    ssl: 'require',
  });
}

export function getSql(): Sql {
  if (!sqlInstance) {
    const databaseUrl = process.env.DATABASE_URL;
    sqlInstance = databaseUrl
      ? createClientFromUrl(databaseUrl)
      : createClient(getConfig());
  }
  return sqlInstance;
}

export async function closeSql(): Promise<void> {
  if (sqlInstance) {
    await sqlInstance.end();
    sqlInstance = null;
  }
}
