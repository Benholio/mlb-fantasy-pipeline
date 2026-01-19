import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { getGame, getRulesets } from '@/api/client';
import { Loader2, Calendar, MapPin, Users } from 'lucide-react';

interface BatterStats {
  player_id: string;
  player_name?: string;
  team_id: string;
  is_home: boolean;
  at_bats: number;
  hits: number;
  doubles: number;
  triples: number;
  home_runs: number;
  runs: number;
  runs_batted_in: number;
  walks: number;
  strikeouts: number;
  stolen_bases: number;
}

interface PitcherStats {
  player_id: string;
  player_name?: string;
  team_id: string;
  is_home: boolean;
  outs_pitched: number;
  hits_allowed: number;
  runs_allowed: number;
  earned_runs: number;
  walks: number;
  strikeouts: number;
  won: boolean;
  lost: boolean;
  saved: boolean;
}

interface FantasyPoints {
  player_id: string;
  player_name?: string;
  stat_type: string;
  total_points: string;
}

export function GamePage() {
  const { id } = useParams<{ id: string }>();
  const [selectedRuleset, setSelectedRuleset] = useState<string>('');

  const { data: rulesets } = useQuery({
    queryKey: ['rulesets'],
    queryFn: getRulesets,
  });

  // Set default ruleset when loaded
  if (!selectedRuleset && rulesets?.rulesets[0]) {
    setSelectedRuleset(rulesets.rulesets[0].id);
  }

  const { data: game, isLoading } = useQuery({
    queryKey: ['game', id, selectedRuleset],
    queryFn: () => getGame(id!, selectedRuleset || undefined),
    enabled: !!id,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!game) {
    return (
      <div className="text-center py-12">
        <h1 className="text-2xl font-bold">Game Not Found</h1>
        <p className="text-muted-foreground">The game you're looking for doesn't exist.</p>
      </div>
    );
  }

  const battingStats = (game.battingStats || []) as BatterStats[];
  const pitchingStats = (game.pitchingStats || []) as PitcherStats[];
  const fantasyPoints = (game.fantasyPoints || []) as FantasyPoints[];

  const homeBatters = battingStats.filter((s) => s.is_home);
  const awayBatters = battingStats.filter((s) => !s.is_home);
  const homePitchers = pitchingStats.filter((s) => s.is_home);
  const awayPitchers = pitchingStats.filter((s) => !s.is_home);

  const formatIP = (outs: number) => {
    const innings = Math.floor(outs / 3);
    const remainder = outs % 3;
    return `${innings}.${remainder}`;
  };

  return (
    <div className="space-y-6">
      {/* Game Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">
            {game.awayTeam} @ {game.homeTeam}
          </h1>
          <div className="mt-2 flex items-center gap-4 text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-4 w-4" />
              {new Date(game.date).toLocaleDateString('en-US', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </span>
            {game.site && (
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {game.site}
              </span>
            )}
          </div>
          <p className="mt-1 text-sm text-muted-foreground">Game ID: {game.id}</p>
        </div>
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
      </div>

      {/* Fantasy Points Summary */}
      {fantasyPoints.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Top Fantasy Performers
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h4 className="mb-2 font-semibold">Batting</h4>
                <div className="space-y-2">
                  {fantasyPoints
                    .filter((p) => p.stat_type === 'batting')
                    .slice(0, 5)
                    .map((p) => (
                      <Link
                        key={p.player_id}
                        to={`/players/${p.player_id}`}
                        className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted"
                      >
                        <span className="font-medium">{p.player_name || p.player_id}</span>
                        <span className="font-bold text-primary">
                          {parseFloat(p.total_points).toFixed(1)} pts
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
              <div>
                <h4 className="mb-2 font-semibold">Pitching</h4>
                <div className="space-y-2">
                  {fantasyPoints
                    .filter((p) => p.stat_type === 'pitching')
                    .slice(0, 5)
                    .map((p) => (
                      <Link
                        key={p.player_id}
                        to={`/players/${p.player_id}`}
                        className="flex items-center justify-between rounded-lg border p-2 transition-colors hover:bg-muted"
                      >
                        <span className="font-medium">{p.player_name || p.player_id}</span>
                        <span className="font-bold text-primary">
                          {parseFloat(p.total_points).toFixed(1)} pts
                        </span>
                      </Link>
                    ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Tabs */}
      <Tabs defaultValue="batting">
        <TabsList>
          <TabsTrigger value="batting">Batting</TabsTrigger>
          <TabsTrigger value="pitching">Pitching</TabsTrigger>
        </TabsList>

        <TabsContent value="batting" className="space-y-4">
          {/* Away Team Batting */}
          <Card>
            <CardHeader>
              <CardTitle>{game.awayTeam} Batting</CardTitle>
              <CardDescription>Away Team</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">AB</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">2B</TableHead>
                    <TableHead className="text-center">3B</TableHead>
                    <TableHead className="text-center">HR</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">RBI</TableHead>
                    <TableHead className="text-center">BB</TableHead>
                    <TableHead className="text-center">K</TableHead>
                    <TableHead className="text-center">SB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awayBatters.map((batter) => (
                    <TableRow key={batter.player_id}>
                      <TableCell>
                        <Link
                          to={`/players/${batter.player_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {batter.player_name || batter.player_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{batter.at_bats}</TableCell>
                      <TableCell className="text-center">{batter.hits}</TableCell>
                      <TableCell className="text-center">{batter.doubles}</TableCell>
                      <TableCell className="text-center">{batter.triples}</TableCell>
                      <TableCell className="text-center">{batter.home_runs}</TableCell>
                      <TableCell className="text-center">{batter.runs}</TableCell>
                      <TableCell className="text-center">{batter.runs_batted_in}</TableCell>
                      <TableCell className="text-center">{batter.walks}</TableCell>
                      <TableCell className="text-center">{batter.strikeouts}</TableCell>
                      <TableCell className="text-center">{batter.stolen_bases}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Home Team Batting */}
          <Card>
            <CardHeader>
              <CardTitle>{game.homeTeam} Batting</CardTitle>
              <CardDescription>Home Team</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">AB</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">2B</TableHead>
                    <TableHead className="text-center">3B</TableHead>
                    <TableHead className="text-center">HR</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">RBI</TableHead>
                    <TableHead className="text-center">BB</TableHead>
                    <TableHead className="text-center">K</TableHead>
                    <TableHead className="text-center">SB</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homeBatters.map((batter) => (
                    <TableRow key={batter.player_id}>
                      <TableCell>
                        <Link
                          to={`/players/${batter.player_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {batter.player_name || batter.player_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{batter.at_bats}</TableCell>
                      <TableCell className="text-center">{batter.hits}</TableCell>
                      <TableCell className="text-center">{batter.doubles}</TableCell>
                      <TableCell className="text-center">{batter.triples}</TableCell>
                      <TableCell className="text-center">{batter.home_runs}</TableCell>
                      <TableCell className="text-center">{batter.runs}</TableCell>
                      <TableCell className="text-center">{batter.runs_batted_in}</TableCell>
                      <TableCell className="text-center">{batter.walks}</TableCell>
                      <TableCell className="text-center">{batter.strikeouts}</TableCell>
                      <TableCell className="text-center">{batter.stolen_bases}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pitching" className="space-y-4">
          {/* Away Team Pitching */}
          <Card>
            <CardHeader>
              <CardTitle>{game.awayTeam} Pitching</CardTitle>
              <CardDescription>Away Team</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">IP</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">ER</TableHead>
                    <TableHead className="text-center">BB</TableHead>
                    <TableHead className="text-center">K</TableHead>
                    <TableHead className="text-center">Dec</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {awayPitchers.map((pitcher) => (
                    <TableRow key={pitcher.player_id}>
                      <TableCell>
                        <Link
                          to={`/players/${pitcher.player_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {pitcher.player_name || pitcher.player_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{formatIP(pitcher.outs_pitched)}</TableCell>
                      <TableCell className="text-center">{pitcher.hits_allowed}</TableCell>
                      <TableCell className="text-center">{pitcher.runs_allowed}</TableCell>
                      <TableCell className="text-center">{pitcher.earned_runs}</TableCell>
                      <TableCell className="text-center">{pitcher.walks}</TableCell>
                      <TableCell className="text-center">{pitcher.strikeouts}</TableCell>
                      <TableCell className="text-center">
                        {pitcher.won && <Badge>W</Badge>}
                        {pitcher.lost && <Badge variant="destructive">L</Badge>}
                        {pitcher.saved && <Badge variant="secondary">SV</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Home Team Pitching */}
          <Card>
            <CardHeader>
              <CardTitle>{game.homeTeam} Pitching</CardTitle>
              <CardDescription>Home Team</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Player</TableHead>
                    <TableHead className="text-center">IP</TableHead>
                    <TableHead className="text-center">H</TableHead>
                    <TableHead className="text-center">R</TableHead>
                    <TableHead className="text-center">ER</TableHead>
                    <TableHead className="text-center">BB</TableHead>
                    <TableHead className="text-center">K</TableHead>
                    <TableHead className="text-center">Dec</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {homePitchers.map((pitcher) => (
                    <TableRow key={pitcher.player_id}>
                      <TableCell>
                        <Link
                          to={`/players/${pitcher.player_id}`}
                          className="font-medium text-primary hover:underline"
                        >
                          {pitcher.player_name || pitcher.player_id}
                        </Link>
                      </TableCell>
                      <TableCell className="text-center">{formatIP(pitcher.outs_pitched)}</TableCell>
                      <TableCell className="text-center">{pitcher.hits_allowed}</TableCell>
                      <TableCell className="text-center">{pitcher.runs_allowed}</TableCell>
                      <TableCell className="text-center">{pitcher.earned_runs}</TableCell>
                      <TableCell className="text-center">{pitcher.walks}</TableCell>
                      <TableCell className="text-center">{pitcher.strikeouts}</TableCell>
                      <TableCell className="text-center">
                        {pitcher.won && <Badge>W</Badge>}
                        {pitcher.lost && <Badge variant="destructive">L</Badge>}
                        {pitcher.saved && <Badge variant="secondary">SV</Badge>}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
