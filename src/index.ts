// Main library exports

// Database
export { createClient, getSql, closeSql, transaction, type Sql } from './db/client.js';
export { runMigrations } from './db/migrations/runner.js';
export * from './db/queries/index.js';

// Ingestion
export {
  downloadPlayingFile,
  parseBattingCSV,
  parsePitchingCSV,
  parseCSV,
  loadPlayingToStaging,
  transformBattingData,
  transformPitchingData,
  ingestYear,
  ingestYears,
  parseYearRange,
  type DataType,
  type IngestOptions,
  type UnifiedIngestResult,
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
