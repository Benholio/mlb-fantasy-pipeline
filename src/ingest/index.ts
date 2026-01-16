import type { Sql } from '../db/client.js';
import { downloadFile, type DataType } from './downloader.js';
import { loadToStaging, createIngestionBatch, updateIngestionBatch, hasCompletedIngestion, clearStagingBatch } from './staging.js';
import { transformData, type TransformResult } from './transformer.js';

export { downloadFile, type DataType } from './downloader.js';
export { parseBattingCSV, parsePitchingCSV, parseCSV } from './parser.js';
export { loadToStaging, loadBattingToStaging, loadPitchingToStaging } from './staging.js';
export { transformBattingData, transformPitchingData, transformData } from './transformer.js';

export interface IngestOptions {
  force?: boolean;
  skipDownload?: boolean;
  skipTransform?: boolean;
  localFile?: string;
}

export interface IngestResult {
  year: number;
  type: DataType;
  skipped: boolean;
  batchId?: string;
  totalRows?: number;
  transform?: TransformResult;
  error?: string;
}

/**
 * Ingest data for a single year and type
 */
export async function ingestYear(
  sql: Sql,
  type: DataType,
  year: number,
  options: IngestOptions = {}
): Promise<IngestResult> {
  const sourceFile = `${type}-${year}.csv`;

  // Check for existing completed ingestion
  if (!options.force && (await hasCompletedIngestion(sql, type, year))) {
    console.log(`${type} ${year} already ingested. Use --force to re-ingest.`);
    return { year, type, skipped: true };
  }

  // Create batch record
  const batchId = await createIngestionBatch(sql, type, year, sourceFile);

  try {
    // Download file (or use local file)
    let filePath: string;
    if (options.localFile) {
      filePath = options.localFile;
    } else if (options.skipDownload) {
      throw new Error('skipDownload specified but no localFile provided');
    } else {
      filePath = await downloadFile(type, year, { force: options.force });
    }

    // Load to staging
    console.log(`Loading ${sourceFile} to staging...`);
    const stagingResult = await loadToStaging(sql, type, filePath, sourceFile);
    console.log(`Staged ${stagingResult.totalRows} rows`);

    await updateIngestionBatch(sql, batchId, {
      totalRows: stagingResult.totalRows,
      status: 'in_progress',
    });

    // Transform to typed tables
    let transform: TransformResult | undefined;
    if (!options.skipTransform) {
      console.log(`Transforming ${sourceFile}...`);
      transform = await transformData(sql, type, stagingResult.batchId);
      console.log(`Transformed ${transform.processedRows} rows`);
    }

    // Mark complete
    await updateIngestionBatch(sql, batchId, {
      status: 'completed',
      processedRows: transform?.processedRows ?? stagingResult.totalRows,
    });

    // Clean up staging data
    await clearStagingBatch(sql, type, stagingResult.batchId);

    return {
      year,
      type,
      skipped: false,
      batchId,
      totalRows: stagingResult.totalRows,
      transform,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateIngestionBatch(sql, batchId, {
      status: 'failed',
      errorMessage,
    });

    return {
      year,
      type,
      skipped: false,
      batchId,
      error: errorMessage,
    };
  }
}

/**
 * Ingest data for multiple years
 */
export async function ingestYears(
  sql: Sql,
  type: DataType,
  years: number[],
  options: IngestOptions = {}
): Promise<IngestResult[]> {
  const results: IngestResult[] = [];

  for (const year of years) {
    console.log(`\n=== Processing ${type} ${year} ===`);
    const result = await ingestYear(sql, type, year, options);
    results.push(result);

    if (result.error) {
      console.error(`Error ingesting ${type} ${year}: ${result.error}`);
    } else if (result.skipped) {
      console.log(`Skipped ${type} ${year}`);
    } else {
      console.log(`Completed ${type} ${year}: ${result.totalRows} rows`);
    }
  }

  return results;
}

/**
 * Parse a year range string like "2020-2023" or "2020,2021,2022"
 */
export function parseYearRange(input: string): number[] {
  const years: number[] = [];

  for (const part of input.split(',')) {
    const trimmed = part.trim();
    if (trimmed.includes('-')) {
      const [start, end] = trimmed.split('-').map((s) => parseInt(s.trim(), 10));
      if (!isNaN(start!) && !isNaN(end!)) {
        for (let y = start!; y <= end!; y++) {
          years.push(y);
        }
      }
    } else {
      const year = parseInt(trimmed, 10);
      if (!isNaN(year)) {
        years.push(year);
      }
    }
  }

  return [...new Set(years)].sort((a, b) => a - b);
}
