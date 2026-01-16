/**
 * Seed fantasy rulesets to the database
 */

import { getSql, closeSql } from '../src/db/client.js';
import { seedStandardRuleset } from '../src/scoring/index.js';

async function seedRulesets() {
  const sql = getSql();

  try {
    console.log('Seeding rulesets...');
    await seedStandardRuleset(sql);
    console.log('Standard ruleset seeded.');

    // Add more preset rulesets here if needed

    console.log('Done!');
  } finally {
    await closeSql();
  }
}

seedRulesets().catch((err) => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
