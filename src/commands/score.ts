import { Command } from 'commander';
import ora from 'ora';
import chalk from 'chalk';
import { getSql, closeSql } from '../db/client.js';
import { getOrLoadRuleset, scoreGamesForYear, scoreGamesForDateRange, seedStandardRuleset } from '../scoring/index.js';
import { getAllRulesets } from '../db/queries/fantasy.js';

export const scoreCommand = new Command('score')
  .description('Calculate fantasy points using specified ruleset')
  .requiredOption('-r, --ruleset <ruleset>', 'Ruleset ID (e.g., standard)')
  .option('-y, --year <year>', 'Calculate for specific year')
  .option('--start-date <date>', 'Start date (YYYY-MM-DD)')
  .option('--end-date <date>', 'End date (YYYY-MM-DD)')
  .option('-f, --force', 'Force recalculation even if points exist', false)
  .option('--seed-standard', 'Seed the standard ruleset to the database', false)
  .action(async (options) => {
    const sql = getSql();
    const spinner = ora();

    try {
      // Seed standard ruleset if requested
      if (options.seedStandard) {
        spinner.start('Seeding standard ruleset...');
        await seedStandardRuleset(sql);
        spinner.succeed('Standard ruleset seeded');
      }

      // Load ruleset
      spinner.start(`Loading ruleset: ${options.ruleset}`);
      const ruleset = await getOrLoadRuleset(sql, options.ruleset);

      if (!ruleset) {
        spinner.fail(`Ruleset not found: ${options.ruleset}`);
        console.log(chalk.yellow('\nAvailable rulesets:'));
        const rulesets = await getAllRulesets(sql);
        for (const r of rulesets) {
          console.log(`  - ${r.id}: ${r.name}`);
        }
        if (rulesets.length === 0) {
          console.log('  (none - try --seed-standard to add the standard ruleset)');
        }
        process.exit(1);
      }

      spinner.succeed(`Loaded ruleset: ${ruleset.name}`);

      // Determine date range
      let result;
      if (options.year) {
        const year = parseInt(options.year, 10);
        spinner.start(`Scoring games for ${year}...`);
        result = await scoreGamesForYear(sql, ruleset, year, { force: options.force });
      } else if (options.startDate && options.endDate) {
        spinner.start(`Scoring games from ${options.startDate} to ${options.endDate}...`);
        result = await scoreGamesForDateRange(sql, ruleset, options.startDate, options.endDate, {
          force: options.force,
        });
      } else {
        spinner.fail('Must specify either --year or --start-date and --end-date');
        process.exit(1);
      }

      spinner.succeed('Scoring complete');

      console.log(chalk.green('\nScoring summary:'));
      console.log(`  Games scored: ${result.gamesScored}`);
      console.log(`  Batting records: ${result.totalBatting}`);
      console.log(`  Pitching records: ${result.totalPitching}`);
    } catch (error) {
      spinner.fail('Scoring failed');
      console.error(chalk.red(error instanceof Error ? error.message : String(error)));
      process.exit(1);
    } finally {
      await closeSql();
    }
  });
