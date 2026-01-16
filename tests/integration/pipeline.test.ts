/**
 * Integration tests for the full pipeline
 *
 * These tests require a running PostgreSQL database.
 * Set up with: docker-compose up -d postgres-test
 *
 * Environment variables (or use defaults for docker-compose test DB):
 * - TEST_DB_HOST (default: localhost)
 * - TEST_DB_PORT (default: 5433)
 * - TEST_DB_USER (default: mlb_test)
 * - TEST_DB_PASSWORD (default: mlb_test_password)
 * - TEST_DB_NAME (default: mlb_fantasy_test)
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import postgres from 'postgres';
import type { Sql } from '../../src/db/client.js';
import { runMigrations } from '../../src/db/migrations/runner.js';
import { loadBattingToStaging, loadPitchingToStaging } from '../../src/ingest/staging.js';
import { transformBattingData, transformPitchingData } from '../../src/ingest/transformer.js';
import { calculateBattingPoints, calculatePitchingPoints } from '../../src/scoring/calculator.js';
import { seedStandardRuleset, scoreGame } from '../../src/scoring/index.js';
import { getBatterStatsByGame, getPitcherStatsByGame } from '../../src/db/queries/stats.js';
import { getFantasyPointsByGame, getRuleset } from '../../src/db/queries/fantasy.js';
import type { FantasyRuleset } from '../../src/types/fantasy.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures');

// Test database configuration
const testDbConfig = {
  host: process.env.TEST_DB_HOST ?? 'localhost',
  port: parseInt(process.env.TEST_DB_PORT ?? '5433', 10),
  user: process.env.TEST_DB_USER ?? 'mlb_test',
  password: process.env.TEST_DB_PASSWORD ?? 'mlb_test_password',
  database: process.env.TEST_DB_NAME ?? 'mlb_fantasy_test',
};

describe('Integration: Full Pipeline', () => {
  let sql: Sql;
  let standardRuleset: FantasyRuleset;
  let dbAvailable = false;

  beforeAll(async () => {
    // Try to connect to test database
    try {
      sql = postgres({
        host: testDbConfig.host,
        port: testDbConfig.port,
        database: testDbConfig.database,
        user: testDbConfig.user,
        password: testDbConfig.password,
        connect_timeout: 5,
      });

      // Test connection
      await sql`SELECT 1`;
      dbAvailable = true;

      // Run migrations
      await runMigrations(sql);

      // Seed standard ruleset
      await seedStandardRuleset(sql);
      standardRuleset = (await getRuleset(sql, 'standard'))!;
    } catch (error) {
      console.warn('Test database not available, skipping integration tests');
      console.warn('Start the test database with: docker-compose up -d postgres-test');
      dbAvailable = false;
    }
  }, 30000);

  afterAll(async () => {
    if (sql) {
      await sql.end();
    }
  });

  beforeEach(async () => {
    if (!dbAvailable) return;

    // Clean up stats tables between tests
    await sql`DELETE FROM fantasy_game_points`;
    await sql`DELETE FROM batter_game_stats`;
    await sql`DELETE FROM pitcher_game_stats`;
    await sql`DELETE FROM games`;
    await sql`DELETE FROM players`;
    await sql`DELETE FROM teams`;
    await sql`DELETE FROM staging_batting`;
    await sql`DELETE FROM staging_pitching`;
  });

  describe('Batting Pipeline', () => {
    it('should ingest and transform batting data', async () => {
      if (!dbAvailable) {
        console.warn('Skipping: Test database not available');
        return;
      }

      // Load to staging
      const stagingResult = await loadBattingToStaging(
        sql,
        join(fixturesDir, 'batting-sample.csv'),
        'batting-sample.csv'
      );

      expect(stagingResult.totalRows).toBe(10);
      expect(stagingResult.batchId).toBeDefined();

      // Transform to typed tables
      const transformResult = await transformBattingData(sql, stagingResult.batchId);

      expect(transformResult.processedRows).toBe(10);
      expect(transformResult.gamesCreated).toBeGreaterThan(0);
      expect(transformResult.playersCreated).toBe(10);
      expect(transformResult.teamsCreated).toBe(2); // ANA and OAK

      // Verify data in tables
      const [playerCount] = await sql<{ count: string }[]>`SELECT COUNT(*) as count FROM players`;
      expect(parseInt(playerCount!.count, 10)).toBe(10);

      const batterStats = await getBatterStatsByGame(sql, 'ANA202304010');
      expect(batterStats.length).toBe(5); // 5 Angels batters

      // Verify specific player stats (Mike Trout)
      const troutStats = batterStats.find((s) => s.player_id === 'troutmi01');
      expect(troutStats).toBeDefined();
      expect(troutStats!.hits).toBe(3);
      expect(troutStats!.home_runs).toBe(1);
      expect(troutStats!.runs_batted_in).toBe(3);
    });

    it('should calculate correct fantasy points for batters', async () => {
      if (!dbAvailable) {
        console.warn('Skipping: Test database not available');
        return;
      }

      // Ingest data
      const stagingResult = await loadBattingToStaging(
        sql,
        join(fixturesDir, 'batting-sample.csv'),
        'batting-sample.csv'
      );
      await transformBattingData(sql, stagingResult.batchId);

      // Get Trout's stats
      const batterStats = await getBatterStatsByGame(sql, 'ANA202304010');
      const troutStats = batterStats.find((s) => s.player_id === 'troutmi01');

      // Calculate fantasy points
      const result = calculateBattingPoints(troutStats!, standardRuleset);

      // Expected for Trout (3 hits, 1 2B, 1 HR, 3 RBI, 2 R, 1 BB, 1 K):
      // runs: 2 * 1 = 2
      // hits: 3 * 0.5 = 1.5
      // doubles: 1 * 0.5 = 0.5
      // home_runs: 1 * 4 = 4
      // runs_batted_in: 3 * 1 = 3
      // walks: 1 * 1 = 1
      // strikeouts: 1 * -0.5 = -0.5
      // Total: 11.5
      expect(result.totalPoints).toBe(11.5);
    });
  });

  describe('Pitching Pipeline', () => {
    it('should ingest and transform pitching data', async () => {
      if (!dbAvailable) {
        console.warn('Skipping: Test database not available');
        return;
      }

      // Load to staging
      const stagingResult = await loadPitchingToStaging(
        sql,
        join(fixturesDir, 'pitching-sample.csv'),
        'pitching-sample.csv'
      );

      expect(stagingResult.totalRows).toBe(7);

      // Transform
      const transformResult = await transformPitchingData(sql, stagingResult.batchId);

      expect(transformResult.processedRows).toBe(7);

      // Verify pitcher stats
      const pitcherStats = await getPitcherStatsByGame(sql, 'ANA202304010');
      expect(pitcherStats.length).toBe(4); // 4 Angels pitchers

      // Verify Sandoval's stats (winning pitcher)
      const sandovalStats = pitcherStats.find((s) => s.player_id === 'sandopa02');
      expect(sandovalStats).toBeDefined();
      expect(sandovalStats!.outs_pitched).toBe(18); // 6 IP
      expect(sandovalStats!.strikeouts).toBe(7);
      expect(sandovalStats!.won).toBe(true);
    });

    it('should calculate correct fantasy points for pitchers', async () => {
      if (!dbAvailable) {
        console.warn('Skipping: Test database not available');
        return;
      }

      // Ingest data
      const stagingResult = await loadPitchingToStaging(
        sql,
        join(fixturesDir, 'pitching-sample.csv'),
        'pitching-sample.csv'
      );
      await transformPitchingData(sql, stagingResult.batchId);

      // Get Sandoval's stats
      const pitcherStats = await getPitcherStatsByGame(sql, 'ANA202304010');
      const sandovalStats = pitcherStats.find((s) => s.player_id === 'sandopa02');

      // Calculate fantasy points
      const result = calculatePitchingPoints(sandovalStats!, standardRuleset);

      // Expected for Sandoval (6 IP, 5 H, 1 ER, 2 BB, 7 K, W):
      // outs_pitched: 18/3 * 1 = 6
      // strikeouts: 7 * 1 = 7
      // won: 1 * 5 = 5
      // earned_runs: 1 * -2 = -2
      // walks: 2 * -1 = -2
      // hits_allowed: 5 * -0.5 = -2.5
      // Total: 11.5
      expect(result.totalPoints).toBe(11.5);
    });
  });

  describe('Full Scoring Pipeline', () => {
    it('should score a complete game with both batting and pitching', async () => {
      if (!dbAvailable) {
        console.warn('Skipping: Test database not available');
        return;
      }

      // Ingest both batting and pitching
      const battingStaging = await loadBattingToStaging(
        sql,
        join(fixturesDir, 'batting-sample.csv'),
        'batting-sample.csv'
      );
      await transformBattingData(sql, battingStaging.batchId);

      const pitchingStaging = await loadPitchingToStaging(
        sql,
        join(fixturesDir, 'pitching-sample.csv'),
        'pitching-sample.csv'
      );
      await transformPitchingData(sql, pitchingStaging.batchId);

      // Score the game
      const scoreResult = await scoreGame(sql, standardRuleset, 'ANA202304010');

      expect(scoreResult.gameId).toBe('ANA202304010');
      expect(scoreResult.battingScores).toBe(5); // 5 Angels batters
      expect(scoreResult.pitchingScores).toBe(4); // 4 Angels pitchers

      // Verify fantasy points were saved
      const fantasyPoints = await getFantasyPointsByGame(sql, 'standard', 'ANA202304010');
      expect(fantasyPoints.length).toBe(9); // 5 batting + 4 pitching

      // Verify Trout's batting points
      const troutPoints = fantasyPoints.find(
        (p) => p.player_id === 'troutmi01' && p.stat_type === 'batting'
      );
      expect(troutPoints).toBeDefined();
      expect(parseFloat(String(troutPoints!.total_points))).toBe(11.5);

      // Verify Sandoval's pitching points
      const sandovalPoints = fantasyPoints.find(
        (p) => p.player_id === 'sandopa02' && p.stat_type === 'pitching'
      );
      expect(sandovalPoints).toBeDefined();
      expect(parseFloat(String(sandovalPoints!.total_points))).toBe(11.5);
    });
  });
});
