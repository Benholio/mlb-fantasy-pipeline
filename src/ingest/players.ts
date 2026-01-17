import { mkdir, writeFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { fileExists } from './downloader.js';
import { streamParseCSV } from './parser.js';
import type { Sql } from '../db/client.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

// The register data is split into 16 files by hex digit
const HEX_DIGITS = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', 'a', 'b', 'c', 'd', 'e', 'f'];

interface RawPersonRow {
  key_person: string;
  key_retro: string;
  key_mlbam?: string;
  key_bbref?: string;
  name_last: string;
  name_first: string;
  name_given?: string;
  name_suffix?: string;
  name_nick?: string;
  birth_year?: string;
  birth_month?: string;
  birth_day?: string;
  death_year?: string;
  death_month?: string;
  death_day?: string;
  pro_played_first?: string;
  pro_played_last?: string;
  mlb_played_first?: string;
  mlb_played_last?: string;
}

/**
 * Get local path for a people file
 */
function getPeopleFilePath(hexDigit: string): string {
  return join(DATA_DIR, `people-${hexDigit}.csv`);
}

/**
 * Download a single people file
 */
async function downloadPeopleFile(hexDigit: string, options: { force?: boolean } = {}): Promise<string> {
  const localPath = getPeopleFilePath(hexDigit);

  if (!options.force && (await fileExists(localPath))) {
    return localPath;
  }

  await mkdir(DATA_DIR, { recursive: true });

  const url = `${config.registerBaseUrl}/people-${hexDigit}.csv`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to download people-${hexDigit}.csv: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  await writeFile(localPath, content, 'utf-8');

  return localPath;
}

/**
 * Download all people files from the register
 */
export async function downloadAllPeopleFiles(options: { force?: boolean } = {}): Promise<string[]> {
  console.log('Downloading player register files...');
  const paths: string[] = [];

  for (const hex of HEX_DIGITS) {
    process.stdout.write(`\rDownloading people-${hex}.csv...`);
    const path = await downloadPeopleFile(hex, options);
    paths.push(path);
  }
  console.log('\rDownloaded all 16 register files.    ');

  return paths;
}

/**
 * Sync player names from the register to the database
 * Only updates players that already exist in our database
 */
export async function syncPlayerNames(sql: Sql): Promise<{ updated: number; total: number }> {
  // First, get all player IDs we have in the database
  const existingPlayers = await sql<{ player_id: string }[]>`
    SELECT player_id FROM players WHERE name_last IS NULL
  `;

  if (existingPlayers.length === 0) {
    console.log('All players already have names');
    return { updated: 0, total: 0 };
  }

  const playerIds = new Set(existingPlayers.map((p) => p.player_id));
  console.log(`Found ${playerIds.size} players needing name updates`);

  // Download all people files
  const filePaths = await downloadAllPeopleFiles();

  // Parse and update matching players
  let updated = 0;
  const BATCH_SIZE = 500;
  let batch: { id: string; first: string; last: string; given: string | null }[] = [];

  const flushBatch = async () => {
    if (batch.length === 0) return;

    // Use a single UPDATE with CASE for efficiency
    await sql`
      UPDATE players
      SET
        name_first = updates.first,
        name_last = updates.last,
        name_given = updates.given
      FROM (
        SELECT * FROM jsonb_to_recordset(${sql.json(batch)}::jsonb)
        AS t(id text, first text, last text, given text)
      ) AS updates
      WHERE players.player_id = updates.id
    `;

    updated += batch.length;
    batch = [];
  };

  // Process each file
  for (const filePath of filePaths) {
    for await (const { row } of streamParseCSV<RawPersonRow>(filePath)) {
      // The retrosplits data uses key_retro as the player ID
      const retroId = row.key_retro;
      if (!retroId || !playerIds.has(retroId)) continue;

      batch.push({
        id: retroId,
        first: row.name_first || '',
        last: row.name_last || '',
        given: row.name_given || null,
      });

      if (batch.length >= BATCH_SIZE) {
        await flushBatch();
        process.stdout.write(`\rUpdated ${updated} players...`);
      }
    }
  }

  await flushBatch();
  console.log(`\rUpdated ${updated} player names`);

  return { updated, total: playerIds.size };
}
