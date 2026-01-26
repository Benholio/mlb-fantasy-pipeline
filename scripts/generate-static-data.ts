#!/usr/bin/env npx tsx
/**
 * Generate static JSON files for Fantasy Flashback
 *
 * This script queries the database for each date with games and writes
 * pre-computed fantasy performance data to static JSON files.
 *
 * Output structure: web/public/data/YYYY/MM-DD.json
 *
 * Usage: npx tsx scripts/generate-static-data.ts
 */

import postgres from 'postgres';
import { mkdirSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';
import 'dotenv/config';

const OUTPUT_DIR = join(process.cwd(), 'web/public/data');
const LIMIT = 10; // Top N batters and pitchers per date

// Standard fantasy scoring rules
const BATTING_RULES = {
  singles: 3,
  doubles: 5,
  triples: 8,
  homeRuns: 10,
  runs: 2,
  rbi: 2,
  walks: 2,
  stolenBases: 5,
  hitByPitch: 2,
};

const PITCHING_RULES = {
  inningsPitched: 2.25,
  strikeouts: 2,
  wins: 5,
  saves: 5,
  earnedRuns: -2,
  hitsAllowed: -1,
  walksAllowed: -1,
  hitBatters: -1,
  losses: -2,
  completeGames: 5,
};

interface BattingStats {
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  stolenBases: number;
  hitByPitch: number;
}

interface PitchingStats {
  inningsPitched: string;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  hitBatters: number;
  win: boolean;
  loss: boolean;
  save: boolean;
  completeGame: boolean;
}

interface Performance {
  playerId: string;
  playerName: string;
  gameId: string;
  date: string;
  points: string;
  stats: BattingStats | PitchingStats;
}

interface DateData {
  date: string;
  batting: Performance[];
  pitching: Performance[];
}

function calculateBattingPoints(stats: BattingStats): number {
  const singles = stats.hits - stats.doubles - stats.triples - stats.homeRuns;
  return (
    singles * BATTING_RULES.singles +
    stats.doubles * BATTING_RULES.doubles +
    stats.triples * BATTING_RULES.triples +
    stats.homeRuns * BATTING_RULES.homeRuns +
    stats.runs * BATTING_RULES.runs +
    stats.rbi * BATTING_RULES.rbi +
    stats.walks * BATTING_RULES.walks +
    stats.stolenBases * BATTING_RULES.stolenBases +
    stats.hitByPitch * BATTING_RULES.hitByPitch
  );
}

function outsToInnings(outs: number): string {
  const fullInnings = Math.floor(outs / 3);
  const partialOuts = outs % 3;
  if (partialOuts === 0) {
    return `${fullInnings}.0`;
  }
  return `${fullInnings}.${partialOuts}`;
}

function calculatePitchingPoints(stats: PitchingStats, outs: number): number {
  const ip = outs / 3;
  return (
    ip * PITCHING_RULES.inningsPitched +
    stats.strikeouts * PITCHING_RULES.strikeouts +
    (stats.win ? PITCHING_RULES.wins : 0) +
    (stats.save ? PITCHING_RULES.saves : 0) +
    (stats.loss ? PITCHING_RULES.losses : 0) +
    stats.earnedRuns * PITCHING_RULES.earnedRuns +
    stats.hitsAllowed * PITCHING_RULES.hitsAllowed +
    stats.walks * PITCHING_RULES.walksAllowed +
    stats.hitBatters * PITCHING_RULES.hitBatters +
    (stats.completeGame ? PITCHING_RULES.completeGames : 0)
  );
}

async function main() {
  // Support both DATABASE_URL and individual DB_* env vars
  let sql;
  if (process.env.DATABASE_URL) {
    sql = postgres(process.env.DATABASE_URL);
  } else if (process.env.DB_HOST) {
    sql = postgres({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || '5432', 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
    });
  } else {
    console.error('DATABASE_URL or DB_* environment variables are required');
    console.error('Set DATABASE_URL=postgres://user:pass@host:5432/dbname');
    console.error('Or set DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME');
    process.exit(1);
  }

  console.log('Fetching all dates with games...');

  // Get all unique dates that have games
  const dates = await sql<{ game_date: Date }[]>`
    SELECT DISTINCT game_date
    FROM games
    ORDER BY game_date
  `;

  console.log(`Found ${dates.length} dates with games`);

  // Create output directory
  if (!existsSync(OUTPUT_DIR)) {
    mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  let processed = 0;
  let skipped = 0;

  for (const { game_date } of dates) {
    const dateStr = game_date.toISOString().split('T')[0];
    const [year, month, day] = dateStr.split('-');

    const yearDir = join(OUTPUT_DIR, year!);
    if (!existsSync(yearDir)) {
      mkdirSync(yearDir, { recursive: true });
    }

    const outputFile = join(yearDir, `${month}-${day}.json`);

    // Get top batting performances for this date
    const battingRows = await sql`
      SELECT
        bs.player_id,
        COALESCE(p.name_first || ' ' || p.name_last, bs.player_id) as player_name,
        bs.game_id,
        g.game_date,
        bs.at_bats,
        bs.hits,
        bs.doubles,
        bs.triples,
        bs.home_runs,
        bs.runs,
        bs.runs_batted_in,
        bs.walks,
        bs.stolen_bases,
        bs.hit_by_pitch,
        (bs.hits - bs.doubles - bs.triples - bs.home_runs) * ${BATTING_RULES.singles} +
        bs.doubles * ${BATTING_RULES.doubles} +
        bs.triples * ${BATTING_RULES.triples} +
        bs.home_runs * ${BATTING_RULES.homeRuns} +
        bs.runs * ${BATTING_RULES.runs} +
        bs.runs_batted_in * ${BATTING_RULES.rbi} +
        bs.walks * ${BATTING_RULES.walks} +
        bs.stolen_bases * ${BATTING_RULES.stolenBases} +
        bs.hit_by_pitch * ${BATTING_RULES.hitByPitch} as points
      FROM batter_game_stats bs
      JOIN games g ON bs.game_id = g.game_id
      LEFT JOIN players p ON bs.player_id = p.player_id
      WHERE g.game_date = ${game_date}
      ORDER BY points DESC
      LIMIT ${LIMIT}
    `;

    // Get top pitching performances for this date
    const pitchingRows = await sql`
      SELECT
        ps.player_id,
        COALESCE(p.name_first || ' ' || p.name_last, ps.player_id) as player_name,
        ps.game_id,
        g.game_date,
        ps.outs_pitched,
        ps.hits_allowed,
        ps.runs_allowed,
        ps.earned_runs,
        ps.walks,
        ps.strikeouts,
        ps.hit_batters,
        ps.won,
        ps.lost,
        ps.saved,
        ps.complete_game,
        (ps.outs_pitched / 3.0) * ${PITCHING_RULES.inningsPitched} +
        ps.strikeouts * ${PITCHING_RULES.strikeouts} +
        CASE WHEN ps.won THEN ${PITCHING_RULES.wins} ELSE 0 END +
        CASE WHEN ps.saved THEN ${PITCHING_RULES.saves} ELSE 0 END +
        CASE WHEN ps.lost THEN ${PITCHING_RULES.losses} ELSE 0 END +
        ps.earned_runs * ${PITCHING_RULES.earnedRuns} +
        ps.hits_allowed * ${PITCHING_RULES.hitsAllowed} +
        ps.walks * ${PITCHING_RULES.walksAllowed} +
        ps.hit_batters * ${PITCHING_RULES.hitBatters} +
        CASE WHEN ps.complete_game THEN ${PITCHING_RULES.completeGames} ELSE 0 END as points
      FROM pitcher_game_stats ps
      JOIN games g ON ps.game_id = g.game_id
      LEFT JOIN players p ON ps.player_id = p.player_id
      WHERE g.game_date = ${game_date}
      ORDER BY points DESC
      LIMIT ${LIMIT}
    `;

    const batting: Performance[] = battingRows.map((row: any) => {
      const stats: BattingStats = {
        atBats: row.at_bats || 0,
        hits: row.hits || 0,
        doubles: row.doubles || 0,
        triples: row.triples || 0,
        homeRuns: row.home_runs || 0,
        runs: row.runs || 0,
        rbi: row.runs_batted_in || 0,
        walks: row.walks || 0,
        stolenBases: row.stolen_bases || 0,
        hitByPitch: row.hit_by_pitch || 0,
      };
      return {
        playerId: row.player_id,
        playerName: row.player_name?.trim() || row.player_id,
        gameId: row.game_id,
        date: row.game_date.toISOString(),
        points: Number(row.points || 0).toFixed(2),
        stats,
      };
    });

    const pitching: Performance[] = pitchingRows.map((row: any) => {
      const outs = row.outs_pitched || 0;
      const stats: PitchingStats = {
        inningsPitched: outsToInnings(outs),
        hitsAllowed: row.hits_allowed || 0,
        runsAllowed: row.runs_allowed || 0,
        earnedRuns: row.earned_runs || 0,
        walks: row.walks || 0,
        strikeouts: row.strikeouts || 0,
        hitBatters: row.hit_batters || 0,
        win: row.won || false,
        loss: row.lost || false,
        save: row.saved || false,
        completeGame: row.complete_game || false,
      };
      return {
        playerId: row.player_id,
        playerName: row.player_name?.trim() || row.player_id,
        gameId: row.game_id,
        date: row.game_date.toISOString(),
        points: Number(row.points || 0).toFixed(2),
        stats,
      };
    });

    if (batting.length === 0 && pitching.length === 0) {
      skipped++;
      continue;
    }

    const data: DateData = {
      date: dateStr,
      batting,
      pitching,
    };

    writeFileSync(outputFile, JSON.stringify(data));
    processed++;

    if (processed % 1000 === 0) {
      console.log(`Processed ${processed} dates...`);
    }
  }

  await sql.end();

  console.log(`\nDone! Generated ${processed} JSON files, skipped ${skipped} empty dates.`);
  console.log(`Output directory: ${OUTPUT_DIR}`);
}

main().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
