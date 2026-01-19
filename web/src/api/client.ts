const API_BASE = '/api';

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}`);
  }
  return response.json();
}

// Types
export interface Player {
  id: string;
  name: string;
  firstName: string | null;
  lastName: string | null;
}

export interface PlayerSearchResult {
  results: Player[];
}

export interface Ruleset {
  id: string;
  name: string;
  description?: string;
}

export interface RulesetsResponse {
  rulesets: Ruleset[];
}

export interface LeaderboardEntry {
  rank: number;
  playerId: string;
  playerName: string;
  games: number;
  totalPoints: string;
  avgPoints: string;
}

export interface LeaderboardResponse {
  ruleset: { id: string; name: string };
  year: number | null;
  type: string;
  total: number;
  entries: LeaderboardEntry[];
}

export interface GameLogEntry {
  gameId: string;
  date: string;
  statType: string;
  points: string;
  breakdown: unknown[];
}

export interface PlayerFantasyResponse {
  playerId: string;
  rulesetId: string;
  summary: {
    games: number;
    totalPoints: string;
    avgPoints: string;
  };
  gameLog: GameLogEntry[];
}

export interface BattingStats {
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

export interface PitchingStats {
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

export interface TopPerformance {
  playerId: string;
  playerName: string;
  gameId: string;
  date: string;
  points: string;
  stats: BattingStats | PitchingStats;
}

export interface TopPerformancesResponse {
  ruleset: { id: string; name: string };
  query: {
    date?: string;
    monthDay?: string;
    yearStart: number | null;
    yearEnd: number | null;
    type: string;
  };
  batting: TopPerformance[];
  pitching: TopPerformance[];
}

export interface GameInfo {
  id: string;
  date: string;
  gameNumber: number;
  site: string | null;
  homeTeam: string | null;
  awayTeam: string | null;
  gameType: string | null;
  hasBox: boolean;
  hasPbp: boolean;
  battingStats: unknown[];
  pitchingStats: unknown[];
  fantasyPoints?: unknown[];
}

export interface GamesResponse {
  total: number;
  returned: number;
  games: Array<{
    id: string;
    date: string;
    gameNumber: number;
    homeTeam: string | null;
    awayTeam: string | null;
    site: string | null;
  }>;
}

export interface YearsResponse {
  years: number[];
}

// API Functions
export async function searchPlayers(query: string, limit = 25): Promise<PlayerSearchResult> {
  return fetchJson(`${API_BASE}/players/search?q=${encodeURIComponent(query)}&limit=${limit}`);
}

export async function getPlayer(id: string): Promise<Player> {
  return fetchJson(`${API_BASE}/players/${encodeURIComponent(id)}`);
}

export async function getPlayerBattingStats(id: string, year?: number) {
  const url = year
    ? `${API_BASE}/players/${encodeURIComponent(id)}/batting-stats?year=${year}`
    : `${API_BASE}/players/${encodeURIComponent(id)}/batting-stats`;
  return fetchJson(url);
}

export async function getPlayerPitchingStats(id: string, year?: number) {
  const url = year
    ? `${API_BASE}/players/${encodeURIComponent(id)}/pitching-stats?year=${year}`
    : `${API_BASE}/players/${encodeURIComponent(id)}/pitching-stats`;
  return fetchJson(url);
}

export async function getPlayerFantasyPoints(
  id: string,
  ruleset: string,
  year?: number
): Promise<PlayerFantasyResponse> {
  const params = new URLSearchParams({ ruleset });
  if (year) params.set('year', String(year));
  return fetchJson(`${API_BASE}/players/${encodeURIComponent(id)}/fantasy-points?${params}`);
}

export async function getRulesets(): Promise<RulesetsResponse> {
  return fetchJson(`${API_BASE}/fantasy/rulesets`);
}

export async function getRuleset(id: string) {
  return fetchJson(`${API_BASE}/fantasy/rulesets/${encodeURIComponent(id)}`);
}

export async function getLeaderboard(params: {
  ruleset: string;
  year?: number;
  type?: 'batting' | 'pitching';
  limit?: number;
  offset?: number;
}): Promise<LeaderboardResponse> {
  const searchParams = new URLSearchParams({ ruleset: params.ruleset });
  if (params.year) searchParams.set('year', String(params.year));
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));
  if (params.offset) searchParams.set('offset', String(params.offset));
  return fetchJson(`${API_BASE}/fantasy/leaderboard?${searchParams}`);
}

export async function getTopPerformances(params: {
  ruleset: string;
  date?: string;
  monthDay?: string;
  yearStart?: number;
  yearEnd?: number;
  type?: 'batting' | 'pitching' | 'both';
  limit?: number;
}): Promise<TopPerformancesResponse> {
  const searchParams = new URLSearchParams({ ruleset: params.ruleset });
  if (params.date) searchParams.set('date', params.date);
  if (params.monthDay) searchParams.set('monthDay', params.monthDay);
  if (params.yearStart) searchParams.set('yearStart', String(params.yearStart));
  if (params.yearEnd) searchParams.set('yearEnd', String(params.yearEnd));
  if (params.type) searchParams.set('type', params.type);
  if (params.limit) searchParams.set('limit', String(params.limit));
  return fetchJson(`${API_BASE}/fantasy/top?${searchParams}`);
}

export async function getGame(id: string, ruleset?: string): Promise<GameInfo> {
  const params = ruleset ? `?ruleset=${encodeURIComponent(ruleset)}` : '';
  return fetchJson(`${API_BASE}/games/${encodeURIComponent(id)}${params}`);
}

export async function getGames(params: {
  date?: string;
  start?: string;
  end?: string;
  year?: number;
  limit?: number;
}): Promise<GamesResponse> {
  const searchParams = new URLSearchParams();
  if (params.date) searchParams.set('date', params.date);
  if (params.start) searchParams.set('start', params.start);
  if (params.end) searchParams.set('end', params.end);
  if (params.year) searchParams.set('year', String(params.year));
  if (params.limit) searchParams.set('limit', String(params.limit));
  return fetchJson(`${API_BASE}/games?${searchParams}`);
}

export async function getYears(): Promise<YearsResponse> {
  return fetchJson(`${API_BASE}/search/years`);
}

export async function search(query: string, type: 'all' | 'players' | 'games' = 'all') {
  return fetchJson(`${API_BASE}/search?q=${encodeURIComponent(query)}&type=${type}`);
}
