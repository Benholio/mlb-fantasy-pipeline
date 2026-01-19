import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { StatLine } from '@/components/StatLine';
import { getGames, getTopPerformances, getRulesets, getYears, type BattingStats, type PitchingStats } from '@/api/client';
import { Loader2, Calendar, Search, Trophy } from 'lucide-react';

export function DateExplorerPage() {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]!
  );
  const [monthDay, setMonthDay] = useState<string>('');
  const [yearStart, setYearStart] = useState<string>('all');
  const [yearEnd, setYearEnd] = useState<string>('all');
  const [selectedRuleset, setSelectedRuleset] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'date' | 'monthday'>('date');

  const { data: rulesets } = useQuery({
    queryKey: ['rulesets'],
    queryFn: getRulesets,
  });

  const { data: years } = useQuery({
    queryKey: ['years'],
    queryFn: getYears,
  });

  // Set default ruleset when loaded
  if (!selectedRuleset && rulesets?.rulesets[0]) {
    setSelectedRuleset(rulesets.rulesets[0].id);
  }

  // Query for specific date
  const { data: games, isLoading: loadingGames } = useQuery({
    queryKey: ['games', selectedDate],
    queryFn: () => getGames({ date: selectedDate, limit: 50 }),
    enabled: activeTab === 'date' && !!selectedDate,
  });

  const { data: datePerformances, isLoading: loadingDatePerf } = useQuery({
    queryKey: ['topPerformances', selectedRuleset, selectedDate],
    queryFn: () =>
      getTopPerformances({
        ruleset: selectedRuleset,
        date: selectedDate,
        limit: 10,
      }),
    enabled: activeTab === 'date' && !!selectedRuleset && !!selectedDate,
  });

  // Query for month-day across years
  const { data: monthDayPerformances, isLoading: loadingMonthDay } = useQuery({
    queryKey: ['topPerformances', selectedRuleset, monthDay, yearStart, yearEnd],
    queryFn: () =>
      getTopPerformances({
        ruleset: selectedRuleset,
        monthDay,
        yearStart: yearStart !== 'all' ? parseInt(yearStart, 10) : undefined,
        yearEnd: yearEnd !== 'all' ? parseInt(yearEnd, 10) : undefined,
        limit: 15,
      }),
    enabled: activeTab === 'monthday' && !!selectedRuleset && !!monthDay,
  });

  const formatMonthDay = (md: string) => {
    const [month, day] = md.split('-');
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December',
    ];
    return `${monthNames[parseInt(month!, 10) - 1]} ${parseInt(day!, 10)}`;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Date Explorer</h1>
        <p className="text-muted-foreground">
          Browse games by date or find top performances on any day in history
        </p>
      </div>

      {/* Ruleset Selector */}
      <div className="flex items-center gap-4">
        <Label>Scoring Ruleset:</Label>
        <Select value={selectedRuleset} onValueChange={setSelectedRuleset}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Select ruleset" />
          </SelectTrigger>
          <SelectContent>
            {rulesets?.rulesets.map((rs) => (
              <SelectItem key={rs.id} value={rs.id}>
                {rs.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'date' | 'monthday')}>
        <TabsList>
          <TabsTrigger value="date">Specific Date</TabsTrigger>
          <TabsTrigger value="monthday">This Day in History</TabsTrigger>
        </TabsList>

        <TabsContent value="date" className="space-y-6">
          {/* Date Picker */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5" />
                Select Date
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4">
                <Input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="w-48"
                />
                <span className="text-muted-foreground">
                  {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Games on Date */}
          <Card>
            <CardHeader>
              <CardTitle>Games</CardTitle>
              <CardDescription>
                {games?.total ?? 0} games on this date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingGames ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : games?.games.length ? (
                <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                  {games.games.map((game) => (
                    <Link
                      key={game.id}
                      to={`/games/${game.id}`}
                      className="rounded-lg border p-3 transition-colors hover:bg-muted"
                    >
                      <p className="font-medium">
                        {game.awayTeam} @ {game.homeTeam}
                      </p>
                      <p className="text-xs text-muted-foreground">{game.id}</p>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">No games found on this date</p>
              )}
            </CardContent>
          </Card>

          {/* Top Performances on Date */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Top Performances
              </CardTitle>
              <CardDescription>
                Best fantasy performances on {new Date(selectedDate + 'T12:00:00').toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingDatePerf ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (datePerformances?.batting.length || datePerformances?.pitching.length) ? (
                <div className="grid gap-6 md:grid-cols-2">
                  {datePerformances.batting.length > 0 && (
                    <div>
                      <h4 className="mb-3 font-semibold">Batting</h4>
                      <div className="space-y-2">
                        {datePerformances.batting.map((perf, i) => (
                          <Link
                            key={`${perf.playerId}-${perf.gameId}`}
                            to={`/players/${perf.playerId}`}
                            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium">{perf.playerName}</p>
                                <StatLine stats={perf.stats as BattingStats} type="batting" compact />
                              </div>
                            </div>
                            <span className="font-bold text-primary">{perf.points} pts</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                  {datePerformances.pitching.length > 0 && (
                    <div>
                      <h4 className="mb-3 font-semibold">Pitching</h4>
                      <div className="space-y-2">
                        {datePerformances.pitching.map((perf, i) => (
                          <Link
                            key={`${perf.playerId}-${perf.gameId}`}
                            to={`/players/${perf.playerId}`}
                            className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                          >
                            <div className="flex items-center gap-3">
                              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                {i + 1}
                              </span>
                              <div>
                                <p className="font-medium">{perf.playerName}</p>
                                <StatLine stats={perf.stats as PitchingStats} type="pitching" compact />
                              </div>
                            </div>
                            <span className="font-bold text-primary">{perf.points} pts</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <p className="py-8 text-center text-muted-foreground">
                  No fantasy data available for this date
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthday" className="space-y-6">
          {/* Month-Day Selector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Search className="h-5 w-5" />
                This Day in History
              </CardTitle>
              <CardDescription>
                Find the best performances on any day across all years
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div>
                  <Label className="mb-2 block">Month-Day (MM-DD)</Label>
                  <Input
                    type="text"
                    placeholder="07-04"
                    value={monthDay}
                    onChange={(e) => setMonthDay(e.target.value)}
                    className="w-28"
                  />
                </div>
                <div>
                  <Label className="mb-2 block">Year Start</Label>
                  <Select value={yearStart} onValueChange={setYearStart}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      {years?.years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="mb-2 block">Year End</Label>
                  <Select value={yearEnd} onValueChange={setYearEnd}>
                    <SelectTrigger className="w-28">
                      <SelectValue placeholder="Any" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Any</SelectItem>
                      {years?.years.map((year) => (
                        <SelectItem key={year} value={String(year)}>
                          {year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Month-Day Results */}
          {monthDay && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Top Performances on {formatMonthDay(monthDay)}
                </CardTitle>
                <CardDescription>
                  {yearStart !== 'all' || yearEnd !== 'all'
                    ? `${yearStart !== 'all' ? yearStart : 'Start'} - ${yearEnd !== 'all' ? yearEnd : 'Present'}`
                    : 'All years'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loadingMonthDay ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : (monthDayPerformances?.batting.length || monthDayPerformances?.pitching.length) ? (
                  <div className="grid gap-6 md:grid-cols-2">
                    {monthDayPerformances.batting.length > 0 && (
                      <div>
                        <h4 className="mb-3 font-semibold">Batting</h4>
                        <div className="space-y-2">
                          {monthDayPerformances.batting.map((perf, i) => (
                            <Link
                              key={`${perf.playerId}-${perf.gameId}`}
                              to={`/players/${perf.playerId}`}
                              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{perf.playerName}</p>
                                  <StatLine stats={perf.stats as BattingStats} type="batting" compact />
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-primary">{perf.points} pts</span>
                                <Badge variant="outline" className="ml-2">
                                  {new Date(perf.date).getFullYear()}
                                </Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                    {monthDayPerformances.pitching.length > 0 && (
                      <div>
                        <h4 className="mb-3 font-semibold">Pitching</h4>
                        <div className="space-y-2">
                          {monthDayPerformances.pitching.map((perf, i) => (
                            <Link
                              key={`${perf.playerId}-${perf.gameId}`}
                              to={`/players/${perf.playerId}`}
                              className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted"
                            >
                              <div className="flex items-center gap-3">
                                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                                  {i + 1}
                                </span>
                                <div>
                                  <p className="font-medium">{perf.playerName}</p>
                                  <StatLine stats={perf.stats as PitchingStats} type="pitching" compact />
                                </div>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-primary">{perf.points} pts</span>
                                <Badge variant="outline" className="ml-2">
                                  {new Date(perf.date).getFullYear()}
                                </Badge>
                              </div>
                            </Link>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="py-8 text-center text-muted-foreground">
                    No fantasy data available for this date
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
