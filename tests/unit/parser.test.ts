import { describe, it, expect } from 'vitest';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { parseBattingCSV, parsePitchingCSV } from '../../src/ingest/parser.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const fixturesDir = join(__dirname, '../fixtures');

describe('CSV Parser', () => {
  describe('parseBattingCSV', () => {
    it('should parse batting CSV file correctly', async () => {
      const rows = await parseBattingCSV(join(fixturesDir, 'batting-sample.csv'));

      expect(rows.length).toBe(10);
      expect(rows[0]).toBeDefined();
      expect(rows[0]!.gid).toBe('ANA202304010');
      expect(rows[0]!.id).toBe('troutmi01');
      expect(rows[0]!.team).toBe('ANA');
      expect(rows[0]!.b_hr).toBe('1');
      expect(rows[0]!.b_rbi).toBe('3');
    });

    it('should handle all batting columns', async () => {
      const rows = await parseBattingCSV(join(fixturesDir, 'batting-sample.csv'));
      const row = rows[0]!;

      // Check key columns exist
      expect(row.gid).toBeDefined();
      expect(row.id).toBeDefined();
      expect(row.team).toBeDefined();
      expect(row.date).toBeDefined();
      expect(row.b_pa).toBeDefined();
      expect(row.b_ab).toBeDefined();
      expect(row.b_h).toBeDefined();
      expect(row.b_hr).toBeDefined();
      expect(row.stattype).toBeDefined();
    });

    it('should handle limit option', async () => {
      const rows = await parseBattingCSV(join(fixturesDir, 'batting-sample.csv'), { limit: 3 });
      expect(rows.length).toBe(3);
    });
  });

  describe('parsePitchingCSV', () => {
    it('should parse pitching CSV file correctly', async () => {
      const rows = await parsePitchingCSV(join(fixturesDir, 'pitching-sample.csv'));

      expect(rows.length).toBe(7);
      expect(rows[0]).toBeDefined();
      expect(rows[0]!.gid).toBe('ANA202304010');
      expect(rows[0]!.id).toBe('sandopa02');
      expect(rows[0]!.p_ipouts).toBe('18'); // 6 innings = 18 outs
      expect(rows[0]!.p_k).toBe('7');
    });

    it('should handle all pitching columns', async () => {
      const rows = await parsePitchingCSV(join(fixturesDir, 'pitching-sample.csv'));
      const row = rows[0]!;

      expect(row.gid).toBeDefined();
      expect(row.id).toBeDefined();
      expect(row.team).toBeDefined();
      expect(row.p_ipouts).toBeDefined();
      expect(row.p_er).toBeDefined();
      expect(row.p_k).toBeDefined();
      expect(row.wp).toBeDefined();
      expect(row.lp).toBeDefined();
      expect(row.save).toBeDefined();
    });
  });
});
