import { useState, useEffect } from 'react';
import { BaseballCardCompact } from '@/components/BaseballCard';
import { Button } from '@/components/ui/button';
import { Loader2, Search } from 'lucide-react';

// Famous dates in baseball history with their stories
const SUGGESTED_DATES = [
  { date: '1939-07-04', label: 'July 4, 1939', story: "Lou Gehrig's farewell" },
  { date: '1961-10-01', label: 'October 1, 1961', story: "Roger Maris hits #61" },
  { date: '1974-04-08', label: 'April 8, 1974', story: "Hank Aaron's 715th HR" },
  { date: '1941-07-17', label: 'July 17, 1941', story: "DiMaggio's 56-game streak ends" },
  { date: '1998-09-08', label: 'September 8, 1998', story: "McGwire's 62nd HR" },
];

interface BattingStats {
  atBats: number;
  hits: number;
  doubles: number;
  triples: number;
  homeRuns: number;
  runs: number;
  rbi: number;
  walks: number;
  stolenBases: number;
  hitByPitch: number;
}

interface PitchingStats {
  inningsPitched: string;
  hitsAllowed: number;
  runsAllowed: number;
  earnedRuns: number;
  walks: number;
  strikeouts: number;
  hitBatters: number;
  win: boolean;
  loss: boolean;
  save: boolean;
  completeGame: boolean;
}

interface Performance {
  playerId: string;
  playerName: string;
  gameId: string;
  date: string;
  points: string;
  stats: BattingStats | PitchingStats;
}

interface DateData {
  date: string;
  batting: Performance[];
  pitching: Performance[];
}

function formatDateForInput(date: Date): string {
  return date.toISOString().split('T')[0] ?? '';
}

function formatDateForDisplay(dateStr: string): string {
  const date = new Date(dateStr + 'T12:00:00');
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

async function fetchDateData(dateStr: string): Promise<DateData | null> {
  const [year, month, day] = dateStr.split('-');
  const url = `/data/${year}/${month}-${day}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
}

export function HomePage() {
  const [selectedDate, setSelectedDate] = useState<string>('');
  const [searchDate, setSearchDate] = useState<string>('');
  const [data, setData] = useState<DateData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = async () => {
    if (!selectedDate) return;

    setSearchDate(selectedDate);
    setIsLoading(true);
    setHasSearched(true);

    const result = await fetchDateData(selectedDate);
    setData(result);
    setIsLoading(false);
  };

  const handleSuggestedDate = async (date: string) => {
    setSelectedDate(date);
    setSearchDate(date);
    setIsLoading(true);
    setHasSearched(true);

    const result = await fetchDateData(date);
    setData(result);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  // Set a random suggested date on first load for demo
  useEffect(() => {
    if (!selectedDate && SUGGESTED_DATES.length > 0) {
      const randomIndex = Math.floor(Math.random() * SUGGESTED_DATES.length);
      const suggestedDate = SUGGESTED_DATES[randomIndex];
      if (suggestedDate) {
        setSelectedDate(suggestedDate.date);
      }
    }
  }, []);

  const hasResults = data && (data.batting.length > 0 || data.pitching.length > 0);

  return (
    <div className="min-h-[calc(100vh-8rem)] flex flex-col">
      {/* Hero Section */}
      <section className="text-center py-12 px-4">
        <h1 className="font-serif text-5xl md:text-6xl lg:text-7xl font-bold text-vintage-navy mb-4 vintage-text-shadow">
          Fantasy Flashback
        </h1>
        <p className="text-lg md:text-xl text-vintage-brown max-w-2xl mx-auto mb-8">
          Relive the greatest fantasy performances from any day in baseball history
        </p>

        {/* Date Picker */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 max-w-md mx-auto mb-6">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            onKeyDown={handleKeyDown}
            min="1901-01-01"
            max={formatDateForInput(new Date())}
            className="flex-1 w-full sm:w-auto px-4 py-3 rounded-lg border-2 border-vintage-brown bg-vintage-cream text-vintage-navy font-medium text-lg focus:outline-none focus:ring-2 focus:ring-vintage-gold"
          />
          <Button
            onClick={handleSearch}
            disabled={!selectedDate || isLoading}
            className="w-full sm:w-auto bg-vintage-red hover:bg-vintage-red/90 text-vintage-cream px-6 py-3 text-lg font-semibold"
          >
            {isLoading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <>
                <Search className="h-5 w-5 mr-2" />
                Go
              </>
            )}
          </Button>
        </div>

        {/* Suggested Dates */}
        <div className="text-sm text-vintage-brown">
          <span className="mr-2">Try:</span>
          {SUGGESTED_DATES.map((item, index) => (
            <span key={item.date}>
              <button
                onClick={() => handleSuggestedDate(item.date)}
                className="text-vintage-navy hover:text-vintage-red underline underline-offset-2 transition-colors"
                title={item.story}
              >
                {item.label}
              </button>
              {index < SUGGESTED_DATES.length - 1 && <span className="mx-2">•</span>}
            </span>
          ))}
        </div>
      </section>

      {/* Results Section */}
      {hasSearched && (
        <section className="flex-1 px-4 pb-12">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-12 w-12 animate-spin text-vintage-red" />
            </div>
          ) : hasResults ? (
            <div className="max-w-4xl mx-auto">
              {/* Date Header */}
              <h2 className="font-serif text-2xl md:text-3xl text-vintage-navy text-center mb-8">
                {formatDateForDisplay(searchDate)}
              </h2>

              {/* Top Performers Lists */}
              <div className="grid md:grid-cols-2 gap-8">
                {/* Top Batters */}
                {data.batting.length > 0 && (
                  <div>
                    <h3 className="font-serif text-lg text-vintage-navy mb-3 border-b-2 border-vintage-gold pb-2">
                      Top Batters
                    </h3>
                    <div className="space-y-2">
                      {data.batting.slice(0, 5).map((perf, idx) => (
                        <BaseballCardCompact
                          key={`${perf.playerId}-${perf.gameId}`}
                          performance={perf}
                          type="batting"
                          rank={idx + 1}
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
                      {data.pitching.slice(0, 5).map((perf, idx) => (
                        <BaseballCardCompact
                          key={`${perf.playerId}-${perf.gameId}`}
                          performance={perf}
                          type="pitching"
                          rank={idx + 1}
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <p className="text-vintage-brown text-lg">
                No games found for this date. Try a different date during the baseball season.
              </p>
            </div>
          )}
        </section>
      )}

      {/* Empty state before search */}
      {!hasSearched && (
        <section className="flex-1 flex items-center justify-center px-4 pb-12">
          <div className="text-center text-vintage-brown">
            <p className="text-lg mb-2">Select a date to discover fantasy performances</p>
            <p className="text-sm opacity-75">Data available from 1901 to present</p>
          </div>
        </section>
      )}
    </div>
  );
}
