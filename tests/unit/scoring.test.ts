import { describe, it, expect, beforeAll } from 'vitest';
import { calculateBattingPoints, calculatePitchingPoints } from '../../src/scoring/calculator.js';
import { loadPresetRuleset } from '../../src/scoring/index.js';
import type { FantasyRuleset } from '../../src/types/fantasy.js';
import type { BatterGameStats, PitcherGameStats } from '../../src/types/database.js';

describe('Scoring Calculator', () => {
  let standardRuleset: FantasyRuleset;

  beforeAll(async () => {
    standardRuleset = await loadPresetRuleset('standard');
  });

  describe('calculateBattingPoints', () => {
    it('should calculate points for a basic hitting game', () => {
      const stats: BatterGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpl01',
        team_id: 'TST',
        is_home: true,
        opponent_id: 'OPP',
        plate_appearances: 5,
        at_bats: 4,
        runs: 2,
        hits: 3,
        doubles: 1,
        triples: 0,
        home_runs: 1,
        runs_batted_in: 3,
        sacrifice_hits: 0,
        sacrifice_flies: 0,
        hit_by_pitch: 0,
        walks: 1,
        intentional_walks: 0,
        strikeouts: 1,
        stolen_bases: 0,
        caught_stealing: 0,
        grounded_into_dp: 0,
        reached_on_interference: 0,
        reached_on_error: 0,
        is_dh: false,
        is_ph: false,
        is_pr: false,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        lineup_position: 3,
        batting_seq: 1,
        created_at: new Date(),
      };

      const result = calculateBattingPoints(stats, standardRuleset);

      // Expected points:
      // runs: 2 * 1 = 2
      // hits: 3 * 0.5 = 1.5
      // doubles: 1 * 0.5 = 0.5
      // home_runs: 1 * 4 = 4
      // runs_batted_in: 3 * 1 = 3
      // walks: 1 * 1 = 1
      // strikeouts: 1 * -0.5 = -0.5
      // Total: 11.5
      expect(result.totalPoints).toBe(11.5);
      expect(result.breakdown.length).toBeGreaterThan(0);
    });

    it('should handle empty stats', () => {
      const stats: BatterGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpl01',
        team_id: 'TST',
        is_home: true,
        opponent_id: null,
        plate_appearances: 0,
        at_bats: 0,
        runs: 0,
        hits: 0,
        doubles: 0,
        triples: 0,
        home_runs: 0,
        runs_batted_in: 0,
        sacrifice_hits: 0,
        sacrifice_flies: 0,
        hit_by_pitch: 0,
        walks: 0,
        intentional_walks: 0,
        strikeouts: 0,
        stolen_bases: 0,
        caught_stealing: 0,
        grounded_into_dp: 0,
        reached_on_interference: 0,
        reached_on_error: 0,
        is_dh: false,
        is_ph: false,
        is_pr: false,
        team_won: null,
        team_lost: null,
        team_tied: null,
        stat_type: null,
        lineup_position: null,
        batting_seq: null,
        created_at: new Date(),
      };

      const result = calculateBattingPoints(stats, standardRuleset);
      expect(result.totalPoints).toBe(0);
      expect(result.breakdown.length).toBe(0);
    });

    it('should handle stolen bases and caught stealing', () => {
      const stats: BatterGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpl01',
        team_id: 'TST',
        is_home: true,
        opponent_id: null,
        plate_appearances: 4,
        at_bats: 4,
        runs: 1,
        hits: 2,
        doubles: 0,
        triples: 0,
        home_runs: 0,
        runs_batted_in: 0,
        sacrifice_hits: 0,
        sacrifice_flies: 0,
        hit_by_pitch: 0,
        walks: 0,
        intentional_walks: 0,
        strikeouts: 0,
        stolen_bases: 3,
        caught_stealing: 1,
        grounded_into_dp: 0,
        reached_on_interference: 0,
        reached_on_error: 0,
        is_dh: false,
        is_ph: false,
        is_pr: false,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        lineup_position: 1,
        batting_seq: 1,
        created_at: new Date(),
      };

      const result = calculateBattingPoints(stats, standardRuleset);

      // runs: 1 * 1 = 1
      // hits: 2 * 0.5 = 1
      // stolen_bases: 3 * 2 = 6
      // caught_stealing: 1 * -1 = -1
      // Total: 7
      expect(result.totalPoints).toBe(7);
    });
  });

  describe('calculatePitchingPoints', () => {
    it('should calculate points for a quality start', () => {
      const stats: PitcherGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpi01',
        team_id: 'TST',
        is_home: true,
        opponent_id: 'OPP',
        outs_pitched: 18, // 6 innings
        batters_faced: 24,
        hits_allowed: 5,
        doubles_allowed: 1,
        triples_allowed: 0,
        home_runs_allowed: 0,
        runs_allowed: 2,
        earned_runs: 2,
        walks: 2,
        intentional_walks: 0,
        strikeouts: 7,
        hit_batters: 0,
        wild_pitches: 0,
        balks: 0,
        sacrifice_hits_allowed: 0,
        sacrifice_flies_allowed: 0,
        stolen_bases_allowed: 0,
        caught_stealing: 0,
        won: true,
        lost: false,
        saved: false,
        game_started: true,
        game_finished: false,
        complete_game: false,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        pitching_seq: 1,
        created_at: new Date(),
      };

      const result = calculatePitchingPoints(stats, standardRuleset);

      // Expected points:
      // outs_pitched: 18/3 * 1 = 6 (innings pitched)
      // strikeouts: 7 * 1 = 7
      // won: 1 * 5 = 5
      // earned_runs: 2 * -2 = -4
      // walks: 2 * -1 = -2
      // hits_allowed: 5 * -0.5 = -2.5
      // Total: 9.5
      expect(result.totalPoints).toBe(9.5);
    });

    it('should calculate points for a save', () => {
      const stats: PitcherGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpi01',
        team_id: 'TST',
        is_home: true,
        opponent_id: null,
        outs_pitched: 3, // 1 inning
        batters_faced: 4,
        hits_allowed: 1,
        doubles_allowed: 0,
        triples_allowed: 0,
        home_runs_allowed: 0,
        runs_allowed: 0,
        earned_runs: 0,
        walks: 0,
        intentional_walks: 0,
        strikeouts: 2,
        hit_batters: 0,
        wild_pitches: 0,
        balks: 0,
        sacrifice_hits_allowed: 0,
        sacrifice_flies_allowed: 0,
        stolen_bases_allowed: 0,
        caught_stealing: 0,
        won: false,
        lost: false,
        saved: true,
        game_started: false,
        game_finished: true,
        complete_game: false,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        pitching_seq: 3,
        created_at: new Date(),
      };

      const result = calculatePitchingPoints(stats, standardRuleset);

      // outs_pitched: 3/3 * 1 = 1
      // strikeouts: 2 * 1 = 2
      // saved: 1 * 5 = 5
      // hits_allowed: 1 * -0.5 = -0.5
      // Total: 7.5
      expect(result.totalPoints).toBe(7.5);
    });

    it('should apply complete game bonus', () => {
      const stats: PitcherGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpi01',
        team_id: 'TST',
        is_home: true,
        opponent_id: null,
        outs_pitched: 27, // 9 innings
        batters_faced: 30,
        hits_allowed: 4,
        doubles_allowed: 0,
        triples_allowed: 0,
        home_runs_allowed: 0,
        runs_allowed: 1,
        earned_runs: 1,
        walks: 1,
        intentional_walks: 0,
        strikeouts: 10,
        hit_batters: 0,
        wild_pitches: 0,
        balks: 0,
        sacrifice_hits_allowed: 0,
        sacrifice_flies_allowed: 0,
        stolen_bases_allowed: 0,
        caught_stealing: 0,
        won: true,
        lost: false,
        saved: false,
        game_started: true,
        game_finished: true,
        complete_game: true,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        pitching_seq: 1,
        created_at: new Date(),
      };

      const result = calculatePitchingPoints(stats, standardRuleset);

      // Base:
      // outs_pitched: 27/3 * 1 = 9
      // strikeouts: 10 * 1 = 10
      // won: 1 * 5 = 5
      // earned_runs: 1 * -2 = -2
      // walks: 1 * -1 = -1
      // hits_allowed: 4 * -0.5 = -2
      // Bonus: Complete Game = 3
      // Total: 22
      expect(result.totalPoints).toBe(22);
      expect(result.bonusesApplied).toContain('Complete Game');
    });

    it('should apply shutout bonus (CG + 0 runs)', () => {
      const stats: PitcherGameStats = {
        id: 1,
        game_id: 'TEST001',
        player_id: 'testpi01',
        team_id: 'TST',
        is_home: true,
        opponent_id: null,
        outs_pitched: 27,
        batters_faced: 28,
        hits_allowed: 3,
        doubles_allowed: 0,
        triples_allowed: 0,
        home_runs_allowed: 0,
        runs_allowed: 0,
        earned_runs: 0,
        walks: 1,
        intentional_walks: 0,
        strikeouts: 12,
        hit_batters: 0,
        wild_pitches: 0,
        balks: 0,
        sacrifice_hits_allowed: 0,
        sacrifice_flies_allowed: 0,
        stolen_bases_allowed: 0,
        caught_stealing: 0,
        won: true,
        lost: false,
        saved: false,
        game_started: true,
        game_finished: true,
        complete_game: true,
        team_won: true,
        team_lost: false,
        team_tied: false,
        stat_type: 'value',
        pitching_seq: 1,
        created_at: new Date(),
      };

      const result = calculatePitchingPoints(stats, standardRuleset);

      // Base:
      // outs_pitched: 9
      // strikeouts: 12
      // won: 5
      // walks: -1
      // hits_allowed: -1.5
      // Bonuses: Complete Game (3) + Shutout (5) = 8
      // Total: 31.5
      expect(result.totalPoints).toBe(31.5);
      expect(result.bonusesApplied).toContain('Complete Game');
      expect(result.bonusesApplied).toContain('Shutout');
    });
  });
});
