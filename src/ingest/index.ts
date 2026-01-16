import type { Sql } from '../db/client.js';
import { downloadPlayingFile } from './downloader.js';
import { loadPlayingToStaging, createIngestionBatch, updateIngestionBatch, hasCompletedIngestion, clearStagingBatch } from './staging.js';
import { transformBattingData, transformPitchingData, type TransformResult } from './transformer.js';

export { downloadPlayingFile, type DataType } from './downloader.js';
export { parseBattingCSV, parsePitchingCSV, parseCSV } from './parser.js';
export { loadPlayingToStaging, loadBattingToStaging, loadPitchingToStaging } from './staging.js';
export { transformBattingData, transformPitchingData, transformData } from './transformer.js';

export interface IngestOptions {
  force?: boolean;
  skipDownload?: boolean;
  skipTransform?: boolean;
  localFile?: string;
}

export interface UnifiedIngestResult {
  year: number;
  skipped: boolean;
  battingBatchId?: string;
  pitchingBatchId?: string;
  totalRows?: number;
  battingRows?: number;
  pitchingRows?: number;
  battingTransform?: TransformResult;
  pitchingTransform?: TransformResult;
  error?: string;
}

/**
 * Ingest all data (batting and pitching) for a single year
 * Downloads the unified playing-YYYY.csv file and processes both stat types
 */
export async function ingestYear(
  sql: Sql,
  year: number,
  options: IngestOptions = {}
): Promise<UnifiedIngestResult> {
  const sourceFile = `playing-${year}.csv`;

  // Check for existing completed ingestion (check both batting and pitching)
  const battingExists = await hasCompletedIngestion(sql, 'batting', year);
  const pitchingExists = await hasCompletedIngestion(sql, 'pitching', year);

  if (!options.force && battingExists && pitchingExists) {
    console.log(`${year} already ingested. Use --force to re-ingest.`);
    return { year, skipped: true };
  }

  // Create batch records for both types
  const battingBatchId = await createIngestionBatch(sql, 'batting', year, sourceFile);
  const pitchingBatchId = await createIngestionBatch(sql, 'pitching', year, sourceFile);

  try {
    // Download file (or use local file)
    let filePath: string;
    if (options.localFile) {
      filePath = options.localFile;
    } else if (options.skipDownload) {
      throw new Error('skipDownload specified but no localFile provided');
    } else {
      filePath = await downloadPlayingFile(year, { force: options.force });
    }

    // Load to staging (handles both batting and pitching)
    console.log(`Loading ${sourceFile} to staging...`);
    const stagingResult = await loadPlayingToStaging(sql, filePath, sourceFile);
    console.log(`Staged ${stagingResult.battingRows} batting rows, ${stagingResult.pitchingRows} pitching rows (from ${stagingResult.totalRows} total rows)`);

    await updateIngestionBatch(sql, battingBatchId, {
      totalRows: stagingResult.battingRows,
      status: 'in_progress',
    });
    await updateIngestionBatch(sql, pitchingBatchId, {
      totalRows: stagingResult.pitchingRows,
      status: 'in_progress',
    });

    // Transform to typed tables
    let battingTransform: TransformResult | undefined;
    let pitchingTransform: TransformResult | undefined;

    if (!options.skipTransform) {
      console.log('Transforming batting data...');
      battingTransform = await transformBattingData(sql, stagingResult.battingBatchId);
      console.log(`Transformed ${battingTransform.processedRows} batting rows`);

      console.log('Transforming pitching data...');
      pitchingTransform = await transformPitchingData(sql, stagingResult.pitchingBatchId);
      console.log(`Transformed ${pitchingTransform.processedRows} pitching rows`);
    }

    // Mark complete
    await updateIngestionBatch(sql, battingBatchId, {
      status: 'completed',
      processedRows: battingTransform?.processedRows ?? stagingResult.battingRows,
    });
    await updateIngestionBatch(sql, pitchingBatchId, {
      status: 'completed',
      processedRows: pitchingTransform?.processedRows ?? stagingResult.pitchingRows,
    });

    // Clean up staging data
    await clearStagingBatch(sql, 'batting', stagingResult.battingBatchId);
    await clearStagingBatch(sql, 'pitching', stagingResult.pitchingBatchId);

    return {
      year,
      skipped: false,
      battingBatchId,
      pitchingBatchId,
      totalRows: stagingResult.totalRows,
      battingRows: stagingResult.battingRows,
      pitchingRows: stagingResult.pitchingRows,
      battingTransform,
      pitchingTransform,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    await updateIngestionBatch(sql, battingBatchId, {
      status: 'failed',
      errorMessage,
    });
    await updateIngestionBatch(sql, pitchingBatchId, {
      status: 'failed',
      errorMessage,
    });

    return {
      year,
      skipped: false,
      battingBatchId,
      pitchingBatchId,
      error: errorMessage,
    };
  }
}

/**
 * Ingest data for multiple years
 */
export async function ingestYears(
  sql: Sql,
  years: number[],
  options: IngestOptions = {}
): Promise<UnifiedIngestResult[]> {
  const results: UnifiedIngestResult[] = [];

  for (const year of years) {
    console.log(`\n=== Processing ${year} ===`);
    const result = await ingestYear(sql, year, options);
    results.push(result);

    if (result.error) {
      console.error(`Error ingesting ${year}: ${result.error}`);
    } else if (result.skipped) {
      console.log(`Skipped ${year}`);
    } else {
      console.log(`Completed ${year}: ${result.battingRows} batting, ${result.pitchingRows} pitching rows`);
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
