// Main library exports

// Database
export { createClient, getSql, closeSql, transaction, type Sql } from './db/client.js';
export { runMigrations } from './db/migrations/runner.js';
export * from './db/queries/index.js';

// Ingestion
export {
  downloadFile,
  parseBattingCSV,
  parsePitchingCSV,
  parseCSV,
  loadToStaging,
  transformData,
  ingestYear,
  ingestYears,
  parseYearRange,
  type DataType,
  type IngestOptions,
  type IngestResult,
} from './ingest/index.js';

// Scoring
export {
  calculateBattingPoints,
  calculatePitchingPoints,
  loadPresetRuleset,
  getOrLoadRuleset,
  seedStandardRuleset,
  scoreGame,
  scoreGamesForDateRange,
  scoreGamesForYear,
} from './scoring/index.js';

// Types
export * from './types/index.js';

// Config
export { loadConfig, config, type Config, type DatabaseConfig } from './config/index.js';
