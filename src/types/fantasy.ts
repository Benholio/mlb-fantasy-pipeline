import { z } from 'zod';

/**
 * Scoring rule for a single stat
 */
export const ScoringRuleSchema = z.object({
  stat: z.string(),
  points: z.number(),
  perUnit: z.number().optional(),
});

export type ScoringRule = z.infer<typeof ScoringRuleSchema>;

/**
 * Condition for bonus/penalty rules
 */
export const BonusConditionSchema = z.object({
  stat: z.string(),
  op: z.enum(['gte', 'lte', 'eq', 'gt', 'lt']),
  value: z.number(),
});

export type BonusCondition = z.infer<typeof BonusConditionSchema>;

/**
 * Bonus or penalty rule
 */
export const BonusRuleSchema = z.object({
  name: z.string(),
  conditions: z.array(BonusConditionSchema),
  logic: z.enum(['AND', 'OR']),
  points: z.number(),
});

export type BonusRule = z.infer<typeof BonusRuleSchema>;

/**
 * Complete fantasy ruleset
 */
export const FantasyRulesetSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  batting: z.array(ScoringRuleSchema),
  pitching: z.array(ScoringRuleSchema),
  bonuses: z.array(BonusRuleSchema).optional(),
});

export type FantasyRuleset = z.infer<typeof FantasyRulesetSchema>;

/**
 * Breakdown of points for a single stat
 */
export interface PointBreakdown {
  stat: string;
  value: number;
  points: number;
  calculation: string;
}

/**
 * Result of scoring calculation
 */
export interface ScoringResult {
  totalPoints: number;
  breakdown: PointBreakdown[];
  bonusesApplied: string[];
}

/**
 * Database representation of fantasy ruleset
 */
export interface FantasyRulesetRow {
  ruleset_id: string;
  name: string;
  description: string | null;
  batting_rules: ScoringRule[];
  pitching_rules: ScoringRule[];
  bonus_rules: BonusRule[] | null;
  created_at: Date;
}

/**
 * Database representation of fantasy game points
 */
export interface FantasyGamePointsRow {
  id: number;
  ruleset_id: string;
  game_id: string;
  player_id: string;
  stat_type: 'batting' | 'pitching';
  total_points: number;
  breakdown: PointBreakdown[];
  game_date: Date;
  calculated_at: Date;
}
