import { mkdir, writeFile, access } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DATA_DIR = join(__dirname, '../../data');

export type DataType = 'batting' | 'pitching';

/**
 * Get the URL for a retrosplits file
 */
export function getFileUrl(type: DataType, year: number): string {
  return `${config.retrosplitsBaseUrl}/${type}-${year}.csv`;
}

/**
 * Get the local path for a downloaded file
 */
export function getLocalPath(type: DataType, year: number): string {
  return join(DATA_DIR, `${type}-${year}.csv`);
}

/**
 * Check if a file exists locally
 */
export async function fileExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Download a retrosplits CSV file
 */
export async function downloadFile(
  type: DataType,
  year: number,
  options: { force?: boolean } = {}
): Promise<string> {
  const localPath = getLocalPath(type, year);

  // Check if file already exists
  if (!options.force && (await fileExists(localPath))) {
    console.log(`File already exists: ${localPath}`);
    return localPath;
  }

  // Ensure data directory exists
  await mkdir(DATA_DIR, { recursive: true });

  const url = getFileUrl(type, year);
  console.log(`Downloading ${url}...`);

  const response = await fetch(url);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Data not available for ${type} ${year} (404 Not Found)`);
    }
    throw new Error(`Failed to download ${url}: ${response.status} ${response.statusText}`);
  }

  const content = await response.text();
  await writeFile(localPath, content, 'utf-8');

  console.log(`Downloaded to ${localPath} (${content.length} bytes)`);
  return localPath;
}

/**
 * Download multiple files
 */
export async function downloadFiles(
  type: DataType,
  years: number[],
  options: { force?: boolean } = {}
): Promise<Map<number, string>> {
  const results = new Map<number, string>();

  for (const year of years) {
    try {
      const path = await downloadFile(type, year, options);
      results.set(year, path);
    } catch (error) {
      console.error(`Failed to download ${type} ${year}:`, error);
    }
  }

  return results;
}
