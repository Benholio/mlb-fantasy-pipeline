import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getSql, closeSql } from '../db/client.js';
import { runMigrations } from '../db/migrations/runner.js';
import { ingestYears, parseYearRange, type DataType } from '../ingest/index.js';

export const ingestCommand = new Command('ingest')
  .description('Ingest Retrosheet data from retrosplits repository')
  .requiredOption('-y, --years <years>', 'Years to ingest (e.g., "2023", "2020-2023", "2020,2021,2022")')
  .option('-t, --type <type>', 'Data type: batting, pitching, or both', 'both')
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

      // Determine types to process
      const types: DataType[] =
        options.type === 'both' ? ['batting', 'pitching'] : [options.type as DataType];

      // Process each type
      for (const type of types) {
        console.log(chalk.cyan(`\n=== Processing ${type} data ===\n`));

        const results = await ingestYears(sql, type, years, {
          force: options.force,
          skipDownload: options.skipDownload,
        });

        // Summary
        const successful = results.filter((r) => !r.error && !r.skipped);
        const skipped = results.filter((r) => r.skipped);
        const failed = results.filter((r) => r.error);

        console.log(chalk.green(`\n${type} ingestion summary:`));
        console.log(`  Successful: ${successful.length}`);
        console.log(`  Skipped: ${skipped.length}`);
        console.log(`  Failed: ${failed.length}`);

        if (failed.length > 0) {
          console.log(chalk.red('\nFailed years:'));
          for (const f of failed) {
            console.log(`  ${f.year}: ${f.error}`);
          }
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
