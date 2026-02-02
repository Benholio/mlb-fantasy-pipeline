import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { BaseballCardCompact } from '@/components/BaseballCard';
import { Loader2 } from 'lucide-react';
import type { BattingStats, PitchingStats } from '@/api/client';

interface Performance {
  playerId: string;
  playerName: string;
  gameId: string;
  date: string;
  points: string;
  stats: BattingStats | PitchingStats;
}

interface YearData {
  year: number;
  batting: Performance[];
  pitching: Performance[];
}

interface YearIndex {
  years: number[];
}

async function fetchYearIndex(): Promise<YearIndex | null> {
  try {
    const response = await fetch('/data/yearly-top/index.json');
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

async function fetchYearData(year: number): Promise<YearData | null> {
  try {
    const response = await fetch(`/data/yearly-top/${year}.json`);
    if (!response.ok) {
      return null;
    }
    const contentType = response.headers.get('content-type');
    if (!contentType?.includes('application/json')) {
      return null;
    }
    return await response.json();
  } catch {
    return null;
  }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

export function TopByYearPage() {
  const { year: yearParam } = useParams<{ year?: string }>();
  const navigate = useNavigate();
  const [availableYears, setAvailableYears] = useState<number[]>([]);
  const [data, setData] = useState<YearData | null>(null);
  const [isLoadingIndex, setIsLoadingIndex] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [indexError, setIndexError] = useState(false);

  const selectedYear = yearParam ? parseInt(yearParam, 10) : null;

  // Load available years on mount
  useEffect(() => {
    async function loadIndex() {
      setIsLoadingIndex(true);
      const index = await fetchYearIndex();
      if (index && index.years.length > 0) {
        setAvailableYears(index.years);
        // If no year in URL, redirect to the most recent year
        if (!yearParam) {
          navigate(`/top-by-year/${index.years[0]}`, { replace: true });
        }
      } else {
        setIndexError(true);
      }
      setIsLoadingIndex(false);
    }
    loadIndex();
  }, [yearParam, navigate]);

  // Load year data when selection changes
  useEffect(() => {
    if (!selectedYear) return;

    const year = selectedYear;
    async function loadData() {
      setIsLoadingData(true);
      const result = await fetchYearData(year);
      setData(result);
      setIsLoadingData(false);
    }
    loadData();
  }, [selectedYear]);

  const hasResults = data && (data.batting.length > 0 || data.pitching.length > 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-vintage-navy mb-4 vintage-text-shadow">
          Top by Year
        </h1>
        <p className="text-lg md:text-xl text-vintage-brown max-w-2xl mx-auto mb-8">
          The best single-game fantasy performances of each season
        </p>

        {/* Year Selector */}
        {isLoadingIndex ? (
          <div className="flex items-center justify-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-vintage-red" />
          </div>
        ) : indexError ? (
          <p className="text-vintage-brown">
            Unable to load years. Make sure to run the data generation script.
          </p>
        ) : (
          <div className="flex items-center justify-center gap-3">
            <label htmlFor="year-select" className="text-vintage-brown font-medium">
              Select Year:
            </label>
            <select
              id="year-select"
              value={selectedYear ?? ''}
              onChange={(e) => navigate(`/top-by-year/${e.target.value}`)}
              className="px-4 py-3 rounded-lg border-2 border-vintage-brown bg-vintage-cream text-vintage-navy font-medium text-lg focus:outline-none focus:ring-2 focus:ring-vintage-gold"
            >
              {availableYears.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        )}
      </section>

      {/* Results Section */}
      <section className="flex-1 px-4 pb-12">
        {isLoadingData ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-12 w-12 animate-spin text-vintage-red" />
          </div>
        ) : hasResults ? (
          <div className="max-w-4xl mx-auto">
            {/* Top Performers Lists */}
            <div className="grid md:grid-cols-2 gap-8">
              {/* Top Batters */}
              {data.batting.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg text-vintage-navy mb-3 border-b-2 border-vintage-gold pb-2">
                    Top Batters
                  </h3>
                  <div className="space-y-2">
                    {data.batting.map((perf, idx) => (
                      <BaseballCardCompact
                        key={`${perf.playerId}-${perf.gameId}`}
                        performance={perf}
                        type="batting"
                        rank={idx + 1}
                        dateLabel={formatDate(perf.date)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Top Pitchers */}
              {data.pitching.length > 0 && (
                <div>
                  <h3 className="font-serif text-lg text-vintage-navy mb-3 border-b-2 border-vintage-gold pb-2">
                    Top Pitchers
                  </h3>
                  <div className="space-y-2">
                    {data.pitching.map((perf, idx) => (
                      <BaseballCardCompact
                        key={`${perf.playerId}-${perf.gameId}`}
                        performance={perf}
                        type="pitching"
                        rank={idx + 1}
                        dateLabel={formatDate(perf.date)}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : selectedYear && !isLoadingIndex ? (
          <div className="text-center py-16">
            <p className="text-vintage-brown text-lg">
              No data available for {selectedYear}. Try selecting a different year.
            </p>
          </div>
        ) : null}
      </section>
    </div>
  );
}
