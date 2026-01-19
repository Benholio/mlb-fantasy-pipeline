import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getPlayer, getPlayerFantasyPoints, getRulesets, getYears } from '@/api/client';
import { Loader2, TrendingUp, Calendar, Award } from 'lucide-react';

export function PlayerPage() {
  const { id } = useParams<{ id: string }>();
  const [selectedRuleset, setSelectedRuleset] = useState<string>('');
  const [selectedYear, setSelectedYear] = useState<string>('all');

  const { data: player, isLoading: loadingPlayer } = useQuery({
    queryKey: ['player', id],
    queryFn: () => getPlayer(id!),
    enabled: !!id,
  });

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

  const { data: fantasyPoints, isLoading: loadingPoints } = useQuery({
    queryKey: ['playerFantasy', id, selectedRuleset, selectedYear],
    queryFn: () =>
      getPlayerFantasyPoints(
        id!,
        selectedRuleset,
        selectedYear !== 'all' ? parseInt(selectedYear, 10) : undefined
      ),
    enabled: !!id && !!selectedRuleset,
  });

  if (loadingPlayer) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!player) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Player Not Found</h1>
        <p className="text-muted-foreground">The player you're looking for doesn't exist.</p>
      </div>
    );
  }

  // Prepare chart data
  const chartData =
    fantasyPoints?.gameLog.map((game) => ({
      date: new Date(game.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      points: parseFloat(game.points),
      gameId: game.gameId,
    })) ?? [];

  // Calculate rolling average (10-game)
  const chartDataWithAvg = chartData.map((d, i) => {
    const start = Math.max(0, i - 9);
    const slice = chartData.slice(start, i + 1);
    const avg = slice.reduce((sum, g) => sum + g.points, 0) / slice.length;
    return { ...d, avg: parseFloat(avg.toFixed(2)) };
  });

  return (
    <div className="space-y-6">
      {/* Player Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{player.name}</h1>
          <p className="text-muted-foreground">Player ID: {player.id}</p>
        </div>
        <div className="flex gap-2">
          <Select value={selectedRuleset} onValueChange={setSelectedRuleset}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Ruleset" />
            </SelectTrigger>
            <SelectContent>
              {rulesets?.rulesets.map((rs) => (
                <SelectItem key={rs.id} value={rs.id}>
                  {rs.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedYear} onValueChange={setSelectedYear}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Years</SelectItem>
              {years?.years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      {fantasyPoints && (
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Points</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {parseFloat(fantasyPoints.summary.totalPoints).toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                {selectedYear === 'all' ? 'All-time' : selectedYear}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Games Played</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fantasyPoints.summary.games.toLocaleString()}</div>
              <p className="text-xs text-muted-foreground">Total games</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Points</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{fantasyPoints.summary.avgPoints}</div>
              <p className="text-xs text-muted-foreground">Per game</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Tabs for different views */}
      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="gamelog">Game Log</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {loadingPoints ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : fantasyPoints && chartDataWithAvg.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>Points Trend</CardTitle>
                <CardDescription>Fantasy points per game with 10-game rolling average</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataWithAvg.slice(-50)}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="points"
                        stroke="hsl(var(--primary))"
                        strokeWidth={2}
                        dot={false}
                        name="Points"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        stroke="hsl(var(--muted-foreground))"
                        strokeWidth={2}
                        strokeDasharray="5 5"
                        dot={false}
                        name="10-Game Avg"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No fantasy data available for this player</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="gamelog">
          <Card>
            <CardHeader>
              <CardTitle>Game Log</CardTitle>
              <CardDescription>
                {fantasyPoints?.gameLog.length ?? 0} games
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPoints ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : fantasyPoints?.gameLog.length ? (
                <div className="max-h-96 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fantasyPoints.gameLog.slice().reverse().map((game) => (
                        <TableRow key={`${game.gameId}-${game.statType}`}>
                          <TableCell>
                            {new Date(game.date).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Link
                              to={`/games/${game.gameId}`}
                              className="text-primary hover:underline"
                            >
                              {game.gameId}
                            </Link>
                          </TableCell>
                          <TableCell>
                            <Badge variant={game.statType === 'batting' ? 'default' : 'secondary'}>
                              {game.statType}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-bold">{game.points}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">No game log available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends">
          <Card>
            <CardHeader>
              <CardTitle>Performance Trends</CardTitle>
              <CardDescription>Detailed analysis of fantasy performance over time</CardDescription>
            </CardHeader>
            <CardContent>
              {loadingPoints ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin" />
                </div>
              ) : fantasyPoints && chartDataWithAvg.length > 0 ? (
                <div className="h-96">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartDataWithAvg}>
                      <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                      <XAxis dataKey="date" className="text-xs" interval="preserveStartEnd" />
                      <YAxis className="text-xs" />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'hsl(var(--popover))',
                          border: '1px solid hsl(var(--border))',
                          borderRadius: '0.5rem',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="points"
                        stroke="hsl(var(--primary))"
                        strokeWidth={1}
                        dot={false}
                        name="Points"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg"
                        stroke="hsl(var(--destructive))"
                        strokeWidth={2}
                        dot={false}
                        name="10-Game Avg"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="py-12 text-center text-muted-foreground">No trend data available</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
