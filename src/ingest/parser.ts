import { createReadStream } from 'fs';
import { parse } from 'csv-parse';
import type { RawBattingRow, RawPitchingRow } from '../types/retrosplits.js';

export interface ParseOptions {
  onRow?: (row: Record<string, string>, index: number) => void;
  limit?: number;
}

/**
 * Parse a CSV file and return rows
 */
export async function parseCSV<T extends Record<string, string>>(
  filePath: string,
  options: ParseOptions = {}
): Promise<T[]> {
  const rows: T[] = [];
  let index = 0;

  return new Promise((resolve, reject) => {
    const parser = createReadStream(filePath).pipe(
      parse({
        columns: true,
        skip_empty_lines: true,
        trim: true,
        relax_column_count: true,
      })
    );

    parser.on('data', (row: T) => {
      if (options.limit && index >= options.limit) {
        parser.destroy();
        return;
      }

      rows.push(row);
      options.onRow?.(row, index);
      index++;
    });

    parser.on('end', () => resolve(rows));
    parser.on('error', reject);
    parser.on('close', () => resolve(rows));
  });
}

/**
 * Parse batting CSV
 */
export async function parseBattingCSV(
  filePath: string,
  options: ParseOptions = {}
): Promise<RawBattingRow[]> {
  return parseCSV<RawBattingRow>(filePath, options);
}

/**
 * Parse pitching CSV
 */
export async function parsePitchingCSV(
  filePath: string,
  options: ParseOptions = {}
): Promise<RawPitchingRow[]> {
  return parseCSV<RawPitchingRow>(filePath, options);
}

/**
 * Stream parse a CSV file (memory efficient for large files)
 */
export async function* streamParseCSV<T extends Record<string, string>>(
  filePath: string
): AsyncGenerator<{ row: T; index: number }> {
  let index = 0;

  const parser = createReadStream(filePath).pipe(
    parse({
      columns: true,
      skip_empty_lines: true,
      trim: true,
      relax_column_count: true,
    })
  );

  for await (const row of parser) {
    yield { row: row as T, index };
    index++;
  }
}
