import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getSql, closeSql } from '../db/client.js';
import { runMigrations } from '../db/migrations/runner.js';
import { ingestYears, parseYearRange } from '../ingest/index.js';
import { syncPlayerNames } from '../ingest/players.js';

export const ingestCommand = new Command('ingest')
  .description('Ingest Retrosheet data from retrosplits repository')
  .requiredOption('-y, --years <years>', 'Years to ingest (e.g., "2023", "2020-2023", "2020,2021,2022")')
  .option('-f, --force', 'Force re-ingestion even if data exists', false)
  .option('--skip-download', 'Skip download, use existing local files', false)
  .option('--migrate', 'Run database migrations before ingesting', false)
  .action(async (options) => {
    const sql = getSql();
    const spinner = ora();

    try {
      // Run migrations if requested
      if (options.migrate) {
        spinner.start('Running database migrations...');
        await runMigrations(sql);
        spinner.succeed('Migrations complete');
      }

      // Parse years
      const years = parseYearRange(options.years);
      if (years.length === 0) {
        console.error(chalk.red('No valid years specified'));
        process.exit(1);
      }

      console.log(chalk.blue(`Ingesting data for years: ${years.join(', ')}`));

      // Ingest all data (batting + pitching from unified playing file)
      const results = await ingestYears(sql, years, {
        force: options.force,
        skipDownload: options.skipDownload,
      });

      // Summary
      const successful = results.filter((r) => !r.error && !r.skipped);
      const skipped = results.filter((r) => r.skipped);
      const failed = results.filter((r) => r.error);

      console.log(chalk.green('\nIngestion summary:'));
      console.log(`  Successful: ${successful.length}`);
      console.log(`  Skipped: ${skipped.length}`);
      console.log(`  Failed: ${failed.length}`);

      if (successful.length > 0) {
        const totalBatting = successful.reduce((sum, r) => sum + (r.battingRows ?? 0), 0);
        const totalPitching = successful.reduce((sum, r) => sum + (r.pitchingRows ?? 0), 0);
        console.log(`  Total batting rows: ${totalBatting.toLocaleString()}`);
        console.log(`  Total pitching rows: ${totalPitching.toLocaleString()}`);
      }

      if (failed.length > 0) {
        console.log(chalk.red('\nFailed years:'));
        for (const f of failed) {
          console.log(`  ${f.year}: ${f.error}`);
        }
      }

      console.log(chalk.green('\nIngestion complete!'));
    } catch (error) {
      spinner.fail('Ingestion failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

export const syncPlayersCommand = new Command('sync-players')
  .description('Sync player names from the Chadwick register')
  .option('--migrate', 'Run database migrations before syncing', false)
  .action(async (options) => {
    const sql = getSql();
    const spinner = ora();

    try {
      if (options.migrate) {
        spinner.start('Running database migrations...');
        await runMigrations(sql);
        spinner.succeed('Migrations complete');
      }

      spinner.start('Syncing player names from Chadwick register...');
      const result = await syncPlayerNames(sql);
      spinner.succeed(`Synced ${result.updated} player names`);

      if (result.total > result.updated) {
        console.log(
          chalk.yellow(`Note: ${result.total - result.updated} players could not be found in register`)
        );
      }
    } catch (error) {
      spinner.fail('Player sync failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });
