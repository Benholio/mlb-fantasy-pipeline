#!/usr/bin/env node

import { Command } from 'commander';
import { ingestCommand } from './commands/ingest.js';
import { scoreCommand } from './commands/score.js';
import { queryCommand } from './commands/query.js';

const program = new Command();

program
  .name('mlb-fantasy')
  .description('MLB Fantasy Baseball Data Pipeline - Ingest historical stats and compute fantasy points')
  .version('1.0.0');

program.addCommand(ingestCommand);
program.addCommand(scoreCommand);
program.addCommand(queryCommand);

// Add migrate command
program
  .command('migrate')
  .description('Run database migrations')
  .action(async () => {
    const { runMigrations } = await import('./db/migrations/runner.js');
    const { closeSql } = await import('./db/client.js');

    try {
      await runMigrations();
      console.log('Migrations completed successfully');
    } catch (error) {
      console.error('Migration failed:', error);
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

// Add seed command
program
  .command('seed')
  .description('Seed default rulesets to the database')
  .action(async () => {
    const { getSql, closeSql } = await import('./db/client.js');
    const { seedStandardRuleset } = await import('./scoring/index.js');

    try {
      const sql = getSql();
      await seedStandardRuleset(sql);
      console.log('Standard ruleset seeded successfully');
    } catch (error) {
      console.error('Seeding failed:', error);
      process.exit(1);
    } finally {
      await closeSql();
    }
  });

program.parse();
