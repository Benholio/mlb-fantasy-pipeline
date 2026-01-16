import { describe, it, expect } from 'vitest';
import { parseYearRange } from '../../src/ingest/index.js';

describe('Transformer Utilities', () => {
  describe('parseYearRange', () => {
    it('should parse single year', () => {
      expect(parseYearRange('2023')).toEqual([2023]);
    });

    it('should parse comma-separated years', () => {
      expect(parseYearRange('2020,2021,2022')).toEqual([2020, 2021, 2022]);
    });

    it('should parse year range', () => {
      expect(parseYearRange('2020-2023')).toEqual([2020, 2021, 2022, 2023]);
    });

    it('should parse mixed format', () => {
      expect(parseYearRange('2018,2020-2022,2024')).toEqual([2018, 2020, 2021, 2022, 2024]);
    });

    it('should handle whitespace', () => {
      expect(parseYearRange(' 2020 , 2021 ')).toEqual([2020, 2021]);
    });

    it('should deduplicate years', () => {
      expect(parseYearRange('2020,2020,2021')).toEqual([2020, 2021]);
    });

    it('should sort years', () => {
      expect(parseYearRange('2023,2020,2021')).toEqual([2020, 2021, 2023]);
    });

    it('should handle invalid input', () => {
      expect(parseYearRange('invalid')).toEqual([]);
    });

    it('should handle empty input', () => {
      expect(parseYearRange('')).toEqual([]);
    });
  });
});
