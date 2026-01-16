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

export const queryCommand = new Command('query')
  .description('Query fantasy data')
  .addCommand(playerCommand)
  .addCommand(gameCommand)
  .addCommand(leadersCommand)
  .addCommand(statsCommand);
