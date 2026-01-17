import { config as loadEnv } from 'dotenv';

// Load .env file
loadEnv();

export interface DatabaseConfig {
  host: string;
  port: number;
  user: string;
  password: string;
  database: string;
}

export interface Config {
  database: DatabaseConfig;
  retrosplitsBaseUrl: string;
  registerBaseUrl: string;
}

function getEnv(key: string, defaultValue?: string): string {
  const value = process.env[key] ?? defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getEnvInt(key: string, defaultValue?: number): number {
  const value = process.env[key];
  if (value === undefined) {
    if (defaultValue === undefined) {
      throw new Error(`Missing required environment variable: ${key}`);
    }
    return defaultValue;
  }
  const parsed = parseInt(value, 10);
  if (isNaN(parsed)) {
    throw new Error(`Invalid integer for environment variable ${key}: ${value}`);
  }
  return parsed;
}

export function loadConfig(): Config {
  return {
    database: {
      host: getEnv('DB_HOST', 'localhost'),
      port: getEnvInt('DB_PORT', 5432),
      user: getEnv('DB_USER', 'mlb'),
      password: getEnv('DB_PASSWORD', 'mlb_dev_password'),
      database: getEnv('DB_NAME', 'mlb_fantasy'),
    },
    retrosplitsBaseUrl: getEnv(
      'RETROSPLITS_BASE_URL',
      'https://raw.githubusercontent.com/chadwickbureau/retrosplits/master/daybyday'
    ),
    registerBaseUrl: getEnv(
      'REGISTER_BASE_URL',
      'https://raw.githubusercontent.com/chadwickbureau/register/master/data'
    ),
  };
}

export const config = loadConfig();
