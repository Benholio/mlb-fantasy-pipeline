import type { BattingStats, PitchingStats } from '@/api/client';

interface StatLineProps {
  stats: BattingStats | PitchingStats;
  type: 'batting' | 'pitching';
  compact?: boolean;
}

export function StatLine({ stats, type, compact = false }: StatLineProps) {
  if (type === 'batting') {
    const batting = stats as BattingStats;
    const parts: string[] = [];

    // Hit line: H-AB
    parts.push(`${batting.hits}-${batting.atBats}`);

    // Extra base hits
    if (batting.homeRuns > 0) parts.push(`${batting.homeRuns} HR`);
    if (batting.triples > 0) parts.push(`${batting.triples} 3B`);
    if (batting.doubles > 0) parts.push(`${batting.doubles} 2B`);

    // Other counting stats
    if (batting.runs > 0) parts.push(`${batting.runs} R`);
    if (batting.rbi > 0) parts.push(`${batting.rbi} RBI`);
    if (batting.walks > 0) parts.push(`${batting.walks} BB`);
    if (batting.stolenBases > 0) parts.push(`${batting.stolenBases} SB`);
    if (batting.hitByPitch > 0) parts.push(`${batting.hitByPitch} HBP`);

    if (compact) {
      return <span className="text-xs text-muted-foreground">{parts.slice(0, 4).join(', ')}</span>;
    }

    return <span className="text-sm text-muted-foreground">{parts.join(', ')}</span>;
  } else {
    const pitching = stats as PitchingStats;
    const parts: string[] = [];

    // Decision
    if (pitching.win) parts.push('W');
    if (pitching.loss) parts.push('L');
    if (pitching.save) parts.push('SV');
    if (pitching.completeGame) parts.push('CG');

    // Core line
    parts.push(`${pitching.inningsPitched} IP`);
    parts.push(`${pitching.hitsAllowed} H`);
    parts.push(`${pitching.earnedRuns} ER`);
    parts.push(`${pitching.strikeouts} K`);
    if (pitching.walks > 0) parts.push(`${pitching.walks} BB`);

    if (compact) {
      return <span className="text-xs text-muted-foreground">{parts.slice(0, 5).join(', ')}</span>;
    }

    return <span className="text-sm text-muted-foreground">{parts.join(', ')}</span>;
  }
}

export function formatBattingLine(stats: BattingStats): string {
  const parts: string[] = [];
  parts.push(`${stats.hits}-${stats.atBats}`);
  if (stats.homeRuns > 0) parts.push(`${stats.homeRuns} HR`);
  if (stats.triples > 0) parts.push(`${stats.triples} 3B`);
  if (stats.doubles > 0) parts.push(`${stats.doubles} 2B`);
  if (stats.runs > 0) parts.push(`${stats.runs} R`);
  if (stats.rbi > 0) parts.push(`${stats.rbi} RBI`);
  if (stats.walks > 0) parts.push(`${stats.walks} BB`);
  if (stats.stolenBases > 0) parts.push(`${stats.stolenBases} SB`);
  return parts.join(', ');
}

export function formatPitchingLine(stats: PitchingStats): string {
  const parts: string[] = [];
  if (stats.win) parts.push('W');
  if (stats.loss) parts.push('L');
  if (stats.save) parts.push('SV');
  parts.push(`${stats.inningsPitched} IP`);
  parts.push(`${stats.hitsAllowed} H`);
  parts.push(`${stats.earnedRuns} ER`);
  parts.push(`${stats.strikeouts} K`);
  if (stats.walks > 0) parts.push(`${stats.walks} BB`);
  return parts.join(', ');
}
