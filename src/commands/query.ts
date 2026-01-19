import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { getSql, closeSql } from '../db/client.js';
import {
  getFantasyPointsByPlayer,
  getFantasyPointsByGame,
  getFantasyLeaderboard,
  getRuleset,
} from '../db/queries/fantasy.js';
import { getBatterStatsByPlayer, getPitcherStatsByPlayer } from '../db/queries/stats.js';

const playerCommand = new Command('player')
  .description('Get player fantasy stats and game log')
  .requiredOption('-p, --player <id>', 'Player ID')
  .requiredOption('-r, --ruleset <id>', 'Ruleset ID')
  .option('-y, --year <year>', 'Filter by year')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const sql = getSql();

    try {
      const year = options.year ? parseInt(options.year, 10) : undefined;

      // Get fantasy points
      const points = await getFantasyPointsByPlayer(sql, options.ruleset, options.player, year);

      if (points.length === 0) {
        console.log(chalk.yellow(`No fantasy points found for player ${options.player}`));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(points, null, 2));
        return;
      }

      // Calculate totals
      const totalPoints = points.reduce((sum, p) => sum + parseFloat(String(p.total_points)), 0);
      const avgPoints = totalPoints / points.length;

      console.log(chalk.blue(`\nPlayer: ${options.player}`));
      console.log(`Games: ${points.length}`);
      console.log(`Total Points: ${totalPoints.toFixed(2)}`);
      console.log(`Avg Points/Game: ${avgPoints.toFixed(2)}`);

      // Show recent games
      const table = new Table({
        head: ['Date', 'Game', 'Type', 'Points'],
        colWidths: [15, 25, 10, 10],
      });

      const recentGames = points.slice(-10);
      for (const p of recentGames) {
        table.push([
          p.game_date.toISOString().split('T')[0],
          p.game_id,
          p.stat_type,
          parseFloat(String(p.total_points)).toFixed(2),
        ]);
      }

      console.log('\nRecent Games:');
      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

const gameCommand = new Command('game')
  .description('Get fantasy points for a specific game')
  .requiredOption('-g, --game <id>', 'Game ID')
  .requiredOption('-r, --ruleset <id>', 'Ruleset ID')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const sql = getSql();

    try {
      const points = await getFantasyPointsByGame(sql, options.ruleset, options.game);

      if (points.length === 0) {
        console.log(chalk.yellow(`No fantasy points found for game ${options.game}`));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(points, null, 2));
        return;
      }

      // Separate batting and pitching
      const batting = points.filter((p) => p.stat_type === 'batting');
      const pitching = points.filter((p) => p.stat_type === 'pitching');

      console.log(chalk.blue(`\nGame: ${options.game}`));
      console.log(`Date: ${points[0]?.game_date.toISOString().split('T')[0]}`);

      if (batting.length > 0) {
        console.log(chalk.cyan('\nBatting:'));
        const battingTable = new Table({
          head: ['Player', 'Points'],
          colWidths: [15, 10],
        });

        for (const p of batting.slice(0, 20)) {
          battingTable.push([p.player_id, parseFloat(String(p.total_points)).toFixed(2)]);
        }

        console.log(battingTable.toString());
      }

      if (pitching.length > 0) {
        console.log(chalk.cyan('\nPitching:'));
        const pitchingTable = new Table({
          head: ['Player', 'Points'],
          colWidths: [15, 10],
        });

        for (const p of pitching) {
          pitchingTable.push([p.player_id, parseFloat(String(p.total_points)).toFixed(2)]);
        }

        console.log(pitchingTable.toString());
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

const leadersCommand = new Command('leaders')
  .description('Get fantasy point leaders')
  .requiredOption('-r, --ruleset <id>', 'Ruleset ID')
  .option('-y, --year <year>', 'Filter by year')
  .option('-t, --type <type>', 'Filter by stat type: batting or pitching')
  .option('-n, --limit <n>', 'Number of results', '25')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const sql = getSql();

    try {
      const leaders = await getFantasyLeaderboard(sql, options.ruleset, {
        year: options.year ? parseInt(options.year, 10) : undefined,
        statType: options.type as 'batting' | 'pitching' | undefined,
        limit: parseInt(options.limit, 10),
      });

      if (leaders.length === 0) {
        console.log(chalk.yellow('No leaders found'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(leaders, null, 2));
        return;
      }

      const ruleset = await getRuleset(sql, options.ruleset);

      console.log(chalk.blue(`\nFantasy Leaders - ${ruleset?.name ?? options.ruleset}`));
      if (options.year) console.log(`Year: ${options.year}`);
      if (options.type) console.log(`Type: ${options.type}`);

      const table = new Table({
        head: ['Rank', 'Player', 'Games', 'Total Pts', 'Avg Pts'],
        colWidths: [6, 15, 8, 12, 10],
      });

      leaders.forEach((leader, i) => {
        table.push([
          i + 1,
          leader.player_id,
          leader.games,
          parseFloat(leader.total_points).toFixed(2),
          parseFloat(leader.avg_points).toFixed(2),
        ]);
      });

      console.log(table.toString());
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

const statsCommand = new Command('stats')
  .description('Get raw stats for a player')
  .requiredOption('-p, --player <id>', 'Player ID')
  .option('-y, --year <year>', 'Filter by year')
  .option('-t, --type <type>', 'Stats type: batting or pitching', 'batting')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const sql = getSql();

    try {
      const year = options.year ? parseInt(options.year, 10) : undefined;

      let stats;
      if (options.type === 'batting') {
        stats = await getBatterStatsByPlayer(sql, options.player, year);
      } else {
        stats = await getPitcherStatsByPlayer(sql, options.player, year);
      }

      if (stats.length === 0) {
        console.log(chalk.yellow(`No ${options.type} stats found for player ${options.player}`));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify(stats, null, 2));
        return;
      }

      console.log(chalk.blue(`\nPlayer: ${options.player}`));
      console.log(`Type: ${options.type}`);
      console.log(`Games: ${stats.length}`);

      if (options.type === 'batting') {
        const table = new Table({
          head: ['Game', 'AB', 'H', '2B', '3B', 'HR', 'RBI', 'BB', 'K', 'SB'],
          colWidths: [15, 5, 5, 5, 5, 5, 5, 5, 5, 5],
        });

        for (const s of stats.slice(-15)) {
          const bs = s as typeof stats[0] & {
            at_bats: number;
            hits: number;
            doubles: number;
            triples: number;
            home_runs: number;
            runs_batted_in: number;
            walks: number;
            strikeouts: number;
            stolen_bases: number;
          };
          table.push([
            bs.game_id.slice(0, 14),
            bs.at_bats,
            bs.hits,
            bs.doubles,
            bs.triples,
            bs.home_runs,
            bs.runs_batted_in,
            bs.walks,
            bs.strikeouts,
            bs.stolen_bases,
          ]);
        }

        console.log('\nRecent Games:');
        console.log(table.toString());
      } else {
        const table = new Table({
          head: ['Game', 'IP', 'H', 'R', 'ER', 'BB', 'K', 'W', 'L', 'SV'],
          colWidths: [15, 6, 5, 5, 5, 5, 5, 5, 5, 5],
        });

        for (const s of stats.slice(-15)) {
          const ps = s as typeof stats[0] & {
            outs_pitched: number;
            hits_allowed: number;
            runs_allowed: number;
            earned_runs: number;
            walks: number;
            strikeouts: number;
            won: boolean;
            lost: boolean;
            saved: boolean;
          };
          const ip = (ps.outs_pitched / 3).toFixed(1);
          table.push([
            ps.game_id.slice(0, 14),
            ip,
            ps.hits_allowed,
            ps.runs_allowed,
            ps.earned_runs,
            ps.walks,
            ps.strikeouts,
            ps.won ? 'W' : '',
            ps.lost ? 'L' : '',
            ps.saved ? 'S' : '',
          ]);
        }

        console.log('\nRecent Games:');
        console.log(table.toString());
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

/**
 * Format innings pitched from outs (e.g., 20 outs -> "6.2")
 */
function formatIP(outs: number): string {
  const fullInnings = Math.floor(outs / 3);
  const remainder = outs % 3;
  return `${fullInnings}.${remainder}`;
}

/**
 * Build a human-readable batting stat line
 */
function formatBattingLine(stats: {
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  runs: number;
  runs_batted_in: number;
  walks: number;
  stolen_bases: number;
  hit_by_pitch: number;
  at_bats: number;
}): string {
  const parts: string[] = [];

  // Hits breakdown
  const singles = stats.hits - stats.doubles - stats.triples - stats.home_runs;
  if (stats.home_runs > 0) parts.push(`${stats.home_runs} HR`);
  if (stats.triples > 0) parts.push(`${stats.triples} 3B`);
  if (stats.doubles > 0) parts.push(`${stats.doubles} 2B`);
  if (singles > 0) parts.push(`${singles} 1B`);

  // Other stats
  if (stats.runs > 0) parts.push(`${stats.runs} R`);
  if (stats.runs_batted_in > 0) parts.push(`${stats.runs_batted_in} RBI`);
  if (stats.walks > 0) parts.push(`${stats.walks} BB`);
  if (stats.stolen_bases > 0) parts.push(`${stats.stolen_bases} SB`);
  if (stats.hit_by_pitch > 0) parts.push(`${stats.hit_by_pitch} HBP`);

  const hitLine = `${stats.hits}-${stats.at_bats}`;
  return `${hitLine}, ${parts.join(', ')}`;
}

/**
 * Build a human-readable pitching stat line
 */
function formatPitchingLine(stats: {
  outs_pitched: number;
  hits_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  walks: number;
  strikeouts: number;
  hit_batters: number;
  won: boolean;
  lost: boolean;
  saved: boolean;
  complete_game: boolean;
}): string {
  const parts: string[] = [];

  // Decision
  if (stats.won) parts.push('W');
  if (stats.lost) parts.push('L');
  if (stats.saved) parts.push('SV');
  if (stats.complete_game) parts.push('CG');

  // Core line: IP, H, R, ER, BB, K
  parts.push(`${formatIP(stats.outs_pitched)} IP`);
  parts.push(`${stats.hits_allowed} H`);
  parts.push(`${stats.runs_allowed} R`);
  parts.push(`${stats.earned_runs} ER`);
  parts.push(`${stats.walks} BB`);
  parts.push(`${stats.strikeouts} K`);

  if (stats.hit_batters > 0) parts.push(`${stats.hit_batters} HBP`);

  return parts.join(', ');
}

const topCommand = new Command('top')
  .description('Get top fantasy performances for a date or date range')
  .requiredOption('-r, --ruleset <id>', 'Ruleset ID')
  .option('-d, --date <date>', 'Specific date (YYYY-MM-DD)')
  .option('--start <date>', 'Start date for range (YYYY-MM-DD)')
  .option('--end <date>', 'End date for range (YYYY-MM-DD)')
  .option('--month-day <MM-DD>', 'Query a specific day across all years (e.g., 07-04 for July 4th)')
  .option('--year-start <year>', 'Lower bound year for --month-day queries (e.g., 2000)')
  .option('--year-end <year>', 'Upper bound year for --month-day queries (e.g., 2025)')
  .option('-t, --type <type>', 'Filter by stat type: batting, pitching, or both', 'both')
  .option('-n, --limit <n>', 'Number of results', '10')
  .option('-f, --format <format>', 'Output format: table, json', 'table')
  .action(async (options) => {
    const sql = getSql();

    try {
      // Determine query mode: month-day across years, specific date, or date range
      let startDate: string | null = null;
      let endDate: string | null = null;
      let monthDay: { month: number; day: number } | null = null;

      // Parse year range options
      let yearStart: number | null = null;
      let yearEnd: number | null = null;

      if (options.yearStart) {
        yearStart = parseInt(options.yearStart, 10);
        if (isNaN(yearStart) || yearStart < 1870 || yearStart > 2100) {
          console.error(chalk.red('Invalid --year-start value. Use a year between 1870 and 2100.'));
          process.exit(1);
        }
      }
      if (options.yearEnd) {
        yearEnd = parseInt(options.yearEnd, 10);
        if (isNaN(yearEnd) || yearEnd < 1870 || yearEnd > 2100) {
          console.error(chalk.red('Invalid --year-end value. Use a year between 1870 and 2100.'));
          process.exit(1);
        }
      }
      if (yearStart !== null && yearEnd !== null && yearStart > yearEnd) {
        console.error(chalk.red('--year-start cannot be greater than --year-end'));
        process.exit(1);
      }

      if (options.monthDay) {
        // Parse MM-DD format
        const match = options.monthDay.match(/^(\d{1,2})-(\d{1,2})$/);
        if (!match) {
          console.error(chalk.red('Invalid --month-day format. Use MM-DD (e.g., 07-04)'));
          process.exit(1);
        }
        monthDay = { month: parseInt(match[1], 10), day: parseInt(match[2], 10) };
        if (monthDay.month < 1 || monthDay.month > 12 || monthDay.day < 1 || monthDay.day > 31) {
          console.error(chalk.red('Invalid month or day value'));
          process.exit(1);
        }
      } else if (options.yearStart || options.yearEnd) {
        console.error(chalk.red('--year-start and --year-end can only be used with --month-day'));
        process.exit(1);
      } else if (options.date) {
        startDate = options.date;
        endDate = options.date;
      } else if (options.start && options.end) {
        startDate = options.start;
        endDate = options.end;
      } else {
        console.error(chalk.red('Must specify --date, --month-day, or both --start and --end'));
        process.exit(1);
      }

      const limit = parseInt(options.limit, 10);
      const showBatting = options.type === 'both' || options.type === 'batting';
      const showPitching = options.type === 'both' || options.type === 'pitching';

      interface BattingPerformance {
        player_id: string;
        player_name: string | null;
        game_id: string;
        game_date: Date;
        total_points: string;
        // Raw stats
        at_bats: number;
        hits: number;
        doubles: number;
        triples: number;
        home_runs: number;
        runs: number;
        runs_batted_in: number;
        walks: number;
        stolen_bases: number;
        hit_by_pitch: number;
      }

      interface PitchingPerformance {
        player_id: string;
        player_name: string | null;
        game_id: string;
        game_date: Date;
        total_points: string;
        // Raw stats
        outs_pitched: number;
        hits_allowed: number;
        runs_allowed: number;
        earned_runs: number;
        walks: number;
        strikeouts: number;
        hit_batters: number;
        won: boolean;
        lost: boolean;
        saved: boolean;
        complete_game: boolean;
      }

      // Query top batting performances with raw stats
      let battingResults: BattingPerformance[] = [];
      if (showBatting) {
        if (monthDay) {
          battingResults = await sql<BattingPerformance[]>`
            SELECT
              fgp.player_id,
              CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
              fgp.game_id,
              fgp.game_date,
              fgp.total_points,
              bgs.at_bats,
              bgs.hits,
              bgs.doubles,
              bgs.triples,
              bgs.home_runs,
              bgs.runs,
              bgs.runs_batted_in,
              bgs.walks,
              bgs.stolen_bases,
              bgs.hit_by_pitch
            FROM fantasy_game_points fgp
            JOIN batter_game_stats bgs ON fgp.game_id = bgs.game_id AND fgp.player_id = bgs.player_id
            LEFT JOIN players p ON fgp.player_id = p.player_id
            WHERE fgp.ruleset_id = ${options.ruleset}
              AND EXTRACT(MONTH FROM fgp.game_date) = ${monthDay.month}
              AND EXTRACT(DAY FROM fgp.game_date) = ${monthDay.day}
              AND fgp.stat_type = 'batting'
              ${yearStart !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) >= ${yearStart}` : sql``}
              ${yearEnd !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) <= ${yearEnd}` : sql``}
            ORDER BY fgp.total_points DESC
            LIMIT ${limit}
          `;
        } else {
          battingResults = await sql<BattingPerformance[]>`
            SELECT
              fgp.player_id,
              CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
              fgp.game_id,
              fgp.game_date,
              fgp.total_points,
              bgs.at_bats,
              bgs.hits,
              bgs.doubles,
              bgs.triples,
              bgs.home_runs,
              bgs.runs,
              bgs.runs_batted_in,
              bgs.walks,
              bgs.stolen_bases,
              bgs.hit_by_pitch
            FROM fantasy_game_points fgp
            JOIN batter_game_stats bgs ON fgp.game_id = bgs.game_id AND fgp.player_id = bgs.player_id
            LEFT JOIN players p ON fgp.player_id = p.player_id
            WHERE fgp.ruleset_id = ${options.ruleset}
              AND fgp.game_date >= ${startDate}::date
              AND fgp.game_date <= ${endDate}::date
              AND fgp.stat_type = 'batting'
            ORDER BY fgp.total_points DESC
            LIMIT ${limit}
          `;
        }
      }

      // Query top pitching performances with raw stats
      let pitchingResults: PitchingPerformance[] = [];
      if (showPitching) {
        if (monthDay) {
          pitchingResults = await sql<PitchingPerformance[]>`
            SELECT
              fgp.player_id,
              CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
              fgp.game_id,
              fgp.game_date,
              fgp.total_points,
              pgs.outs_pitched,
              pgs.hits_allowed,
              pgs.runs_allowed,
              pgs.earned_runs,
              pgs.walks,
              pgs.strikeouts,
              pgs.hit_batters,
              pgs.won,
              pgs.lost,
              pgs.saved,
              pgs.complete_game
            FROM fantasy_game_points fgp
            JOIN pitcher_game_stats pgs ON fgp.game_id = pgs.game_id AND fgp.player_id = pgs.player_id
            LEFT JOIN players p ON fgp.player_id = p.player_id
            WHERE fgp.ruleset_id = ${options.ruleset}
              AND EXTRACT(MONTH FROM fgp.game_date) = ${monthDay.month}
              AND EXTRACT(DAY FROM fgp.game_date) = ${monthDay.day}
              AND fgp.stat_type = 'pitching'
              ${yearStart !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) >= ${yearStart}` : sql``}
              ${yearEnd !== null ? sql`AND EXTRACT(YEAR FROM fgp.game_date) <= ${yearEnd}` : sql``}
            ORDER BY fgp.total_points DESC
            LIMIT ${limit}
          `;
        } else {
          pitchingResults = await sql<PitchingPerformance[]>`
            SELECT
              fgp.player_id,
              CASE WHEN p.name_first IS NOT NULL THEN p.name_first || ' ' || p.name_last ELSE NULL END as player_name,
              fgp.game_id,
              fgp.game_date,
              fgp.total_points,
              pgs.outs_pitched,
              pgs.hits_allowed,
              pgs.runs_allowed,
              pgs.earned_runs,
              pgs.walks,
              pgs.strikeouts,
              pgs.hit_batters,
              pgs.won,
              pgs.lost,
              pgs.saved,
              pgs.complete_game
            FROM fantasy_game_points fgp
            JOIN pitcher_game_stats pgs ON fgp.game_id = pgs.game_id AND fgp.player_id = pgs.player_id
            LEFT JOIN players p ON fgp.player_id = p.player_id
            WHERE fgp.ruleset_id = ${options.ruleset}
              AND fgp.game_date >= ${startDate}::date
              AND fgp.game_date <= ${endDate}::date
              AND fgp.stat_type = 'pitching'
            ORDER BY fgp.total_points DESC
            LIMIT ${limit}
          `;
        }
      }

      if (battingResults.length === 0 && pitchingResults.length === 0) {
        console.log(chalk.yellow('No performances found for the specified date(s)'));
        return;
      }

      if (options.format === 'json') {
        console.log(JSON.stringify({ batting: battingResults, pitching: pitchingResults }, null, 2));
        return;
      }

      const ruleset = await getRuleset(sql, options.ruleset);
      let dateDisplay: string;
      if (monthDay) {
        const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
          'July', 'August', 'September', 'October', 'November', 'December'];
        let yearRange: string;
        if (yearStart !== null && yearEnd !== null) {
          yearRange = `${yearStart}-${yearEnd}`;
        } else if (yearStart !== null) {
          yearRange = `${yearStart}+`;
        } else if (yearEnd !== null) {
          yearRange = `through ${yearEnd}`;
        } else {
          yearRange = 'all years';
        }
        dateDisplay = `${monthNames[monthDay.month]} ${monthDay.day} (${yearRange})`;
      } else {
        dateDisplay = startDate === endDate ? startDate! : `${startDate} to ${endDate}`;
      }

      console.log(chalk.blue(`\nTop Performances - ${ruleset?.name ?? options.ruleset}`));
      console.log(`Date: ${dateDisplay}`);

      // Display batting results
      if (battingResults.length > 0) {
        console.log(chalk.cyan('\n=== Top Batting Performances ===\n'));

        for (let i = 0; i < battingResults.length; i++) {
          const r = battingResults[i]!;
          const pts = parseFloat(r.total_points).toFixed(1);
          const date = r.game_date.toISOString().split('T')[0];
          const statLine = formatBattingLine(r);
          const playerDisplay = r.player_name || r.player_id;

          console.log(chalk.white(`${i + 1}. ${playerDisplay} - ${chalk.green(pts + ' pts')}`));
          console.log(chalk.gray(`   ${date} | ${r.game_id}`));
          console.log(chalk.yellow(`   ${statLine}`));
          console.log();
        }
      }

      // Display pitching results
      if (pitchingResults.length > 0) {
        console.log(chalk.cyan('\n=== Top Pitching Performances ===\n'));

        for (let i = 0; i < pitchingResults.length; i++) {
          const r = pitchingResults[i]!;
          const pts = parseFloat(r.total_points).toFixed(1);
          const date = r.game_date.toISOString().split('T')[0];
          const statLine = formatPitchingLine(r);
          const playerDisplay = r.player_name || r.player_id;

          console.log(chalk.white(`${i + 1}. ${playerDisplay} - ${chalk.green(pts + ' pts')}`));
          console.log(chalk.gray(`   ${date} | ${r.game_id}`));
          console.log(chalk.yellow(`   ${statLine}`));
          console.log();
        }
      }
    } catch (error) {
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

export const queryCommand = new Command('query')
  .description('Query fantasy data')
  .addCommand(playerCommand)
  .addCommand(gameCommand)
  .addCommand(leadersCommand)
  .addCommand(statsCommand)
  .addCommand(topCommand);
