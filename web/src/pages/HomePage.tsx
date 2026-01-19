import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StatLine } from '@/components/StatLine';
import { getRulesets, getLeaderboard, getTopPerformances, type BattingStats, type PitchingStats } from '@/api/client';
import { Trophy, Calendar, Database, TrendingUp, Users, Loader2 } from 'lucide-react';

export function HomePage() {
  const { data: rulesets } = useQuery({
    queryKey: ['rulesets'],
    queryFn: getRulesets,
  });

  const defaultRuleset = rulesets?.rulesets[0]?.id;

  const { data: topBatters, isLoading: loadingBatters } = useQuery({
    queryKey: ['leaderboard', defaultRuleset, 'batting'],
    queryFn: () =>
      getLeaderboard({
        ruleset: defaultRuleset!,
        type: 'batting',
        limit: 5,
      }),
    enabled: !!defaultRuleset,
  });

  const { data: topPitchers, isLoading: loadingPitchers } = useQuery({
    queryKey: ['leaderboard', defaultRuleset, 'pitching'],
    queryFn: () =>
      getLeaderboard({
        ruleset: defaultRuleset!,
        type: 'pitching',
        limit: 5,
      }),
    enabled: !!defaultRuleset,
  });

  // Get today's date in MM-DD format
  const today = new Date();
  const monthDay = `${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const { data: todayInHistory } = useQuery({
    queryKey: ['topPerformances', defaultRuleset, monthDay],
    queryFn: () =>
      getTopPerformances({
        ruleset: defaultRuleset!,
        monthDay,
        limit: 5,
      }),
    enabled: !!defaultRuleset,
  });

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="text-center">
        <h1 className="text-4xl font-bold tracking-tight">MLB Fantasy Baseball Dashboard</h1>
        <p className="mt-2 text-lg text-muted-foreground">
          Explore historical baseball data, view leaderboards, and analyze player performances
        </p>
      </div>

      {/* Quick Links */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Leaderboards</CardTitle>
            <Trophy className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">View top fantasy performers by year and stat type</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link to="/leaderboards">View Leaderboards</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Date Explorer</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">
              Browse games by date and find top performances on any day
            </p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link to="/explore">Explore Dates</Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Query Builder</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <p className="text-xs text-muted-foreground">Build custom queries with advanced filters</p>
            <Button asChild className="mt-4 w-full" variant="outline">
              <Link to="/query">Build Query</Link>
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Top Performers */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Top Batters */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Top Batters (All-Time)
            </CardTitle>
            <CardDescription>
              {rulesets?.rulesets[0]?.name || 'Loading ruleset...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingBatters ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : topBatters?.entries.length ? (
              <div className="space-y-2">
                {topBatters.entries.map((entry) => (
                  <Link
                    key={entry.playerId}
                    to={`/players/${entry.playerId}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {entry.rank}
                      </span>
                      <div>
                        <p className="font-medium">{entry.playerName}</p>
                        <p className="text-xs text-muted-foreground">{entry.games} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">{entry.avgPoints} avg</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>

        {/* Top Pitchers */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Pitchers (All-Time)
            </CardTitle>
            <CardDescription>
              {rulesets?.rulesets[0]?.name || 'Loading ruleset...'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingPitchers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : topPitchers?.entries.length ? (
              <div className="space-y-2">
                {topPitchers.entries.map((entry) => (
                  <Link
                    key={entry.playerId}
                    to={`/players/${entry.playerId}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                        {entry.rank}
                      </span>
                      <div>
                        <p className="font-medium">{entry.playerName}</p>
                        <p className="text-xs text-muted-foreground">{entry.games} games</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-bold">{entry.totalPoints}</p>
                      <p className="text-xs text-muted-foreground">{entry.avgPoints} avg</p>
                    </div>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-muted-foreground">No data available</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* This Day in History */}
      {todayInHistory && (todayInHistory.batting.length > 0 || todayInHistory.pitching.length > 0) && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              This Day in Baseball History
            </CardTitle>
            <CardDescription>
              Top performances on {today.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} across all
              years
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-6 md:grid-cols-2">
              {todayInHistory.batting.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold">Batting</h4>
                  <div className="space-y-2">
                    {todayInHistory.batting.slice(0, 3).map((perf) => (
                      <Link
                        key={`${perf.playerId}-${perf.gameId}`}
                        to={`/players/${perf.playerId}`}
                        className="block rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{perf.playerName}</span>
                          <span className="font-bold text-primary">{perf.points} pts</span>
                        </div>
                        <StatLine stats={perf.stats as BattingStats} type="batting" compact />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(perf.date).getFullYear()}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {todayInHistory.pitching.length > 0 && (
                <div>
                  <h4 className="mb-3 font-semibold">Pitching</h4>
                  <div className="space-y-2">
                    {todayInHistory.pitching.slice(0, 3).map((perf) => (
                      <Link
                        key={`${perf.playerId}-${perf.gameId}`}
                        to={`/players/${perf.playerId}`}
                        className="block rounded-lg border p-3 transition-colors hover:bg-muted"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{perf.playerName}</span>
                          <span className="font-bold text-primary">{perf.points} pts</span>
                        </div>
                        <StatLine stats={perf.stats as PitchingStats} type="pitching" compact />
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(perf.date).getFullYear()}
                        </p>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
