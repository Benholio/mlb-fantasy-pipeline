import type { BattingStats, PitchingStats, TopPerformance } from '@/api/client';

interface BaseballCardProps {
  performance: TopPerformance;
  type: 'batting' | 'pitching';
  rank?: number;
}

export function BaseballCardCompact({ performance, type, rank }: BaseballCardProps) {
  const stats = performance.stats;
  const year = new Date(performance.date).getFullYear();

  return (
    <div className="vintage-card rounded-lg p-0.5">
      <div className="vintage-card-inner rounded px-3 py-2 flex items-center gap-4">
        {rank && (
          <span className="bg-vintage-gold text-vintage-navy w-7 h-7 rounded-full text-sm font-bold flex items-center justify-center flex-shrink-0">
            {rank}
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-serif font-semibold text-vintage-navy truncate">
              {performance.playerName}
            </span>
            <span className="text-vintage-brown text-sm">({year})</span>
          </div>
          <div className="text-xs text-vintage-brown truncate">
            {type === 'batting' ? (
              <CompactBattingStats stats={stats as BattingStats} />
            ) : (
              <CompactPitchingStats stats={stats as PitchingStats} />
            )}
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <div className="font-bold text-vintage-red text-lg">{performance.points}</div>
          <div className="text-xs text-vintage-brown">pts</div>
        </div>
      </div>
    </div>
  );
}

function CompactBattingStats({ stats }: { stats: BattingStats }) {
  const parts: string[] = [`${stats.hits}-${stats.atBats}`];
  if (stats.homeRuns > 0) parts.push(`${stats.homeRuns} HR`);
  if (stats.rbi > 0) parts.push(`${stats.rbi} RBI`);
  if (stats.runs > 0) parts.push(`${stats.runs} R`);
  return <>{parts.join(', ')}</>;
}

function CompactPitchingStats({ stats }: { stats: PitchingStats }) {
  const parts: string[] = [];
  if (stats.win) parts.push('W');
  if (stats.loss) parts.push('L');
  if (stats.save) parts.push('SV');
  parts.push(`${stats.inningsPitched} IP`, `${stats.strikeouts} K`);
  return <>{parts.join(', ')}</>;
}
