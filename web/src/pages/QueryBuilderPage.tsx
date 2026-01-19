import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getTopPerformances, getRulesets, getYears, type BattingStats, type PitchingStats } from '@/api/client';
import { Loader2, Download, Search, Filter } from 'lucide-react';

export function QueryBuilderPage() {
  const [selectedRuleset, setSelectedRuleset] = useState<string>('');
  const [queryType, setQueryType] = useState<'date' | 'monthday'>('date');
  const [date, setDate] = useState<string>('');
  const [monthDay, setMonthDay] = useState<string>('');
  const [yearStart, setYearStart] = useState<string>('');
  const [yearEnd, setYearEnd] = useState<string>('');
  const [statType, setStatType] = useState<'both' | 'batting' | 'pitching'>('both');
  const [limit, setLimit] = useState<string>('25');
  const [isQuerying, setIsQuerying] = useState(false);

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

  const getQueryParams = () => {
    const params: {
      ruleset: string;
      date?: string;
      monthDay?: string;
      yearStart?: number;
      yearEnd?: number;
      type?: 'batting' | 'pitching' | 'both';
      limit?: number;
    } = {
      ruleset: selectedRuleset,
      type: statType,
      limit: parseInt(limit, 10),
    };

    if (queryType === 'date' && date) {
      params.date = date;
    } else if (queryType === 'monthday' && monthDay) {
      params.monthDay = monthDay;
      if (yearStart) params.yearStart = parseInt(yearStart, 10);
      if (yearEnd) params.yearEnd = parseInt(yearEnd, 10);
    }

    return params;
  };

  const canQuery = () => {
    if (!selectedRuleset) return false;
    if (queryType === 'date' && !date) return false;
    if (queryType === 'monthday' && !monthDay) return false;
    return true;
  };

  const { data: results, isLoading, refetch } = useQuery({
    queryKey: ['query', getQueryParams()],
    queryFn: () => getTopPerformances(getQueryParams()),
    enabled: false,
  });

  const handleQuery = async () => {
    setIsQuerying(true);
    await refetch();
    setIsQuerying(false);
  };

  const exportCSV = () => {
    if (!results) return;

    const rows: string[] = [];

    // Header
    if (statType === 'both' || statType === 'batting') {
      rows.push('Type,Rank,Player ID,Player Name,Game ID,Date,Points,AB,H,2B,3B,HR,R,RBI,BB,SB,HBP');
      results.batting.forEach((p, i) => {
        const stats = p.stats as BattingStats;
        rows.push(
          `Batting,${i + 1},${p.playerId},"${p.playerName}",${p.gameId},${p.date},${p.points},${stats.atBats},${stats.hits},${stats.doubles},${stats.triples},${stats.homeRuns},${stats.runs},${stats.rbi},${stats.walks},${stats.stolenBases},${stats.hitByPitch}`
        );
      });
    }

    if (statType === 'both' || statType === 'pitching') {
      if (rows.length === 0) {
        rows.push('Type,Rank,Player ID,Player Name,Game ID,Date,Points,IP,H,R,ER,BB,K,HBP,W,L,SV,CG');
      }
      results.pitching.forEach((p, i) => {
        const stats = p.stats as PitchingStats;
        rows.push(
          `Pitching,${i + 1},${p.playerId},"${p.playerName}",${p.gameId},${p.date},${p.points},${stats.inningsPitched},${stats.hitsAllowed},${stats.runsAllowed},${stats.earnedRuns},${stats.walks},${stats.strikeouts},${stats.hitBatters},${stats.win ? 'Y' : 'N'},${stats.loss ? 'Y' : 'N'},${stats.save ? 'Y' : 'N'},${stats.completeGame ? 'Y' : 'N'}`
        );
      });
    }

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fantasy-query-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Query Builder</h1>
        <p className="text-muted-foreground">Build custom queries to find top fantasy performances</p>
      </div>

      {/* Query Form */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Query Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Ruleset */}
            <div>
              <Label className="mb-2 block">Ruleset</Label>
              <Select value={selectedRuleset} onValueChange={setSelectedRuleset}>
                <SelectTrigger>
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

            {/* Query Type */}
            <div>
              <Label className="mb-2 block">Query Type</Label>
              <Select value={queryType} onValueChange={(v: 'date' | 'monthday') => setQueryType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="date">Specific Date</SelectItem>
                  <SelectItem value="monthday">Month-Day (All Years)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Stat Type */}
            <div>
              <Label className="mb-2 block">Stat Type</Label>
              <Select value={statType} onValueChange={(v: 'both' | 'batting' | 'pitching') => setStatType(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="both">Both</SelectItem>
                  <SelectItem value="batting">Batting Only</SelectItem>
                  <SelectItem value="pitching">Pitching Only</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Limit */}
            <div>
              <Label className="mb-2 block">Results Limit</Label>
              <Select value={limit} onValueChange={setLimit}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10</SelectItem>
                  <SelectItem value="25">25</SelectItem>
                  <SelectItem value="50">50</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Date Input */}
          {queryType === 'date' && (
            <div>
              <Label className="mb-2 block">Date</Label>
              <Input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-48"
              />
            </div>
          )}

          {/* Month-Day Input */}
          {queryType === 'monthday' && (
            <div className="flex flex-wrap gap-4">
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
                <Label className="mb-2 block">Year Start (Optional)</Label>
                <Select value={yearStart} onValueChange={setYearStart}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {years?.years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Year End (Optional)</Label>
                <Select value={yearEnd} onValueChange={setYearEnd}>
                  <SelectTrigger className="w-28">
                    <SelectValue placeholder="Any" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Any</SelectItem>
                    {years?.years.map((year) => (
                      <SelectItem key={year} value={String(year)}>
                        {year}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {/* Query Button */}
          <div className="flex gap-2">
            <Button onClick={handleQuery} disabled={!canQuery() || isQuerying}>
              {isQuerying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Querying...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Run Query
                </>
              )}
            </Button>
            {results && (
              <Button variant="outline" onClick={exportCSV}>
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {isLoading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      )}

      {results && (
        <div className="space-y-6">
          {/* Batting Results */}
          {(statType === 'both' || statType === 'batting') && results.batting.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Batting Results</CardTitle>
                <CardDescription>{results.batting.length} results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-center">AB</TableHead>
                        <TableHead className="text-center">H</TableHead>
                        <TableHead className="text-center">HR</TableHead>
                        <TableHead className="text-center">RBI</TableHead>
                        <TableHead className="text-center">SB</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.batting.map((perf, i) => {
                        const stats = perf.stats as BattingStats;
                        return (
                          <TableRow key={`${perf.playerId}-${perf.gameId}`}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell>
                              <Link
                                to={`/players/${perf.playerId}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {perf.playerName}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/games/${perf.gameId}`}
                                className="text-muted-foreground hover:underline"
                              >
                                {perf.gameId}
                              </Link>
                            </TableCell>
                            <TableCell>{new Date(perf.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {perf.points}
                            </TableCell>
                            <TableCell className="text-center">{stats.atBats}</TableCell>
                            <TableCell className="text-center">{stats.hits}</TableCell>
                            <TableCell className="text-center">{stats.homeRuns}</TableCell>
                            <TableCell className="text-center">{stats.rbi}</TableCell>
                            <TableCell className="text-center">{stats.stolenBases}</TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Pitching Results */}
          {(statType === 'both' || statType === 'pitching') && results.pitching.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Pitching Results</CardTitle>
                <CardDescription>{results.pitching.length} results</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Player</TableHead>
                        <TableHead>Game</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Points</TableHead>
                        <TableHead className="text-center">IP</TableHead>
                        <TableHead className="text-center">H</TableHead>
                        <TableHead className="text-center">ER</TableHead>
                        <TableHead className="text-center">K</TableHead>
                        <TableHead className="text-center">Dec</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {results.pitching.map((perf, i) => {
                        const stats = perf.stats as PitchingStats;
                        return (
                          <TableRow key={`${perf.playerId}-${perf.gameId}`}>
                            <TableCell className="font-bold">{i + 1}</TableCell>
                            <TableCell>
                              <Link
                                to={`/players/${perf.playerId}`}
                                className="font-medium text-primary hover:underline"
                              >
                                {perf.playerName}
                              </Link>
                            </TableCell>
                            <TableCell>
                              <Link
                                to={`/games/${perf.gameId}`}
                                className="text-muted-foreground hover:underline"
                              >
                                {perf.gameId}
                              </Link>
                            </TableCell>
                            <TableCell>{new Date(perf.date).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right font-bold text-primary">
                              {perf.points}
                            </TableCell>
                            <TableCell className="text-center">{stats.inningsPitched}</TableCell>
                            <TableCell className="text-center">{stats.hitsAllowed}</TableCell>
                            <TableCell className="text-center">{stats.earnedRuns}</TableCell>
                            <TableCell className="text-center">{stats.strikeouts}</TableCell>
                            <TableCell className="text-center">
                              {stats.win && <Badge className="mr-1">W</Badge>}
                              {stats.loss && <Badge variant="destructive" className="mr-1">L</Badge>}
                              {stats.save && <Badge variant="secondary">SV</Badge>}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* No Results */}
          {results.batting.length === 0 && results.pitching.length === 0 && (
            <Card>
              <CardContent className="py-12 text-center">
                <p className="text-muted-foreground">No results found for your query</p>
              </CardContent>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}
