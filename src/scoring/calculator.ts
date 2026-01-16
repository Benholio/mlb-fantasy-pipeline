import type {
  FantasyRuleset,
  ScoringRule,
  BonusRule,
  PointBreakdown,
  ScoringResult,
} from '../types/fantasy.js';
import type { BatterGameStats, PitcherGameStats } from '../types/database.js';

/**
 * Calculate points for a single scoring rule
 */
function calculateRulePoints(
  value: number | boolean | null | undefined,
  rule: ScoringRule
): PointBreakdown | null {
  // Handle boolean values (convert to 1 or 0)
  let numValue: number;
  if (typeof value === 'boolean') {
    numValue = value ? 1 : 0;
  } else if (value === null || value === undefined) {
    return null;
  } else {
    numValue = value;
  }

  if (numValue === 0) return null;

  let points: number;
  let calculation: string;

  if (rule.perUnit) {
    points = (numValue / rule.perUnit) * rule.points;
    calculation = `${numValue}/${rule.perUnit} * ${rule.points}`;
  } else {
    points = numValue * rule.points;
    calculation = `${numValue} * ${rule.points}`;
  }

  return {
    stat: rule.stat,
    value: numValue,
    points: Math.round(points * 100) / 100, // Round to 2 decimal places
    calculation,
  };
}

/**
 * Evaluate bonus conditions
 */
function evaluateBonusConditions(
  stats: Record<string, unknown>,
  bonus: BonusRule
): boolean {
  const results = bonus.conditions.map((condition) => {
    let value = stats[condition.stat];

    // Handle boolean values
    if (typeof value === 'boolean') {
      value = value ? 1 : 0;
    }

    if (value === null || value === undefined) {
      value = 0;
    }

    const numValue = typeof value === 'number' ? value : 0;

    switch (condition.op) {
      case 'gte':
        return numValue >= condition.value;
      case 'lte':
        return numValue <= condition.value;
      case 'gt':
        return numValue > condition.value;
      case 'lt':
        return numValue < condition.value;
      case 'eq':
        return numValue === condition.value;
      default:
        return false;
    }
  });

  return bonus.logic === 'AND' ? results.every(Boolean) : results.some(Boolean);
}

/**
 * Calculate batting fantasy points
 */
export function calculateBattingPoints(
  stats: BatterGameStats,
  ruleset: FantasyRuleset
): ScoringResult {
  const breakdown: PointBreakdown[] = [];
  let totalPoints = 0;

  // Map stat names to BatterGameStats properties
  const statMapping: Record<string, keyof BatterGameStats> = {
    plate_appearances: 'plate_appearances',
    at_bats: 'at_bats',
    runs: 'runs',
    hits: 'hits',
    doubles: 'doubles',
    triples: 'triples',
    home_runs: 'home_runs',
    runs_batted_in: 'runs_batted_in',
    sacrifice_hits: 'sacrifice_hits',
    sacrifice_flies: 'sacrifice_flies',
    hit_by_pitch: 'hit_by_pitch',
    walks: 'walks',
    intentional_walks: 'intentional_walks',
    strikeouts: 'strikeouts',
    stolen_bases: 'stolen_bases',
    caught_stealing: 'caught_stealing',
    grounded_into_dp: 'grounded_into_dp',
    reached_on_interference: 'reached_on_interference',
    reached_on_error: 'reached_on_error',
  };

  // Apply base scoring rules
  for (const rule of ruleset.batting) {
    const propName = statMapping[rule.stat] ?? (rule.stat as keyof BatterGameStats);
    const value = stats[propName];

    const result = calculateRulePoints(value as number | boolean | null | undefined, rule);
    if (result) {
      breakdown.push(result);
      totalPoints += result.points;
    }
  }

  // Apply bonuses
  const bonusesApplied: string[] = [];
  if (ruleset.bonuses) {
    const statsRecord = stats as unknown as Record<string, unknown>;
    for (const bonus of ruleset.bonuses) {
      // Only apply batting-relevant bonuses
      const isBattingBonus = bonus.conditions.some((c) => c.stat in statMapping);
      if (isBattingBonus && evaluateBonusConditions(statsRecord, bonus)) {
        totalPoints += bonus.points;
        bonusesApplied.push(bonus.name);
        breakdown.push({
          stat: `bonus:${bonus.name}`,
          value: 1,
          points: bonus.points,
          calculation: `Bonus: ${bonus.name}`,
        });
      }
    }
  }

  return {
    totalPoints: Math.round(totalPoints * 100) / 100,
    breakdown,
    bonusesApplied,
  };
}

/**
 * Calculate pitching fantasy points
 */
export function calculatePitchingPoints(
  stats: PitcherGameStats,
  ruleset: FantasyRuleset
): ScoringResult {
  const breakdown: PointBreakdown[] = [];
  let totalPoints = 0;

  // Map stat names to PitcherGameStats properties
  const statMapping: Record<string, keyof PitcherGameStats> = {
    outs_pitched: 'outs_pitched',
    innings_pitched: 'outs_pitched', // Will be divided by 3
    batters_faced: 'batters_faced',
    hits_allowed: 'hits_allowed',
    doubles_allowed: 'doubles_allowed',
    triples_allowed: 'triples_allowed',
    home_runs_allowed: 'home_runs_allowed',
    runs_allowed: 'runs_allowed',
    earned_runs: 'earned_runs',
    walks: 'walks',
    intentional_walks: 'intentional_walks',
    strikeouts: 'strikeouts',
    hit_batters: 'hit_batters',
    wild_pitches: 'wild_pitches',
    balks: 'balks',
    sacrifice_hits_allowed: 'sacrifice_hits_allowed',
    sacrifice_flies_allowed: 'sacrifice_flies_allowed',
    stolen_bases_allowed: 'stolen_bases_allowed',
    caught_stealing: 'caught_stealing',
    won: 'won',
    lost: 'lost',
    saved: 'saved',
    save: 'saved',
    game_started: 'game_started',
    game_finished: 'game_finished',
    complete_game: 'complete_game',
  };

  // Apply base scoring rules
  for (const rule of ruleset.pitching) {
    const propName = statMapping[rule.stat] ?? (rule.stat as keyof PitcherGameStats);
    const value = stats[propName];

    const result = calculateRulePoints(value as number | boolean | null | undefined, rule);
    if (result) {
      breakdown.push(result);
      totalPoints += result.points;
    }
  }

  // Apply bonuses
  const bonusesApplied: string[] = [];
  if (ruleset.bonuses) {
    const statsRecord = stats as unknown as Record<string, unknown>;
    for (const bonus of ruleset.bonuses) {
      // Only apply pitching-relevant bonuses
      const isPitchingBonus = bonus.conditions.some((c) => c.stat in statMapping);
      if (isPitchingBonus && evaluateBonusConditions(statsRecord, bonus)) {
        totalPoints += bonus.points;
        bonusesApplied.push(bonus.name);
        breakdown.push({
          stat: `bonus:${bonus.name}`,
          value: 1,
          points: bonus.points,
          calculation: `Bonus: ${bonus.name}`,
        });
      }
    }
  }

  return {
    totalPoints: Math.round(totalPoints * 100) / 100,
    breakdown,
    bonusesApplied,
  };
}
