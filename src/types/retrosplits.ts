/**
 * Raw playing row from retrosplits daybyday/playing-YYYY.csv
 * Contains both batting and pitching stats in a single row
 * All fields are strings as they come from the CSV
 */
export interface RawPlayingRow {
  // Game identifiers
  'game.key': string;
  'game.source': string;
  'game.date': string;
  'game.number': string;
  'appear.date': string;
  'site.key': string;
  'season.phase': string;
  'team.alignment': string; // 1 = home, 0 = away
  'team.key': string;
  'opponent.key': string;
  'person.key': string;
  slot: string;
  seq: string;

  // Batting stats (B_ prefix)
  B_G: string;
  B_PA: string;
  B_AB: string;
  B_R: string;
  B_H: string;
  B_TB: string;
  B_2B: string;
  B_3B: string;
  B_HR: string;
  B_HR4: string;
  B_RBI: string;
  B_GW: string;
  B_BB: string;
  B_IBB: string;
  B_SO: string;
  B_GDP: string;
  B_HP: string;
  B_SH: string;
  B_SF: string;
  B_SB: string;
  B_CS: string;
  B_XI: string;
  B_G_DH: string;
  B_G_PH: string;
  B_G_PR: string;

  // Pitching stats (P_ prefix)
  P_G: string;
  P_GS: string;
  P_CG: string;
  P_SHO: string;
  P_GF: string;
  P_W: string;
  P_L: string;
  P_SV: string;
  P_OUT: string;
  P_TBF: string;
  P_AB: string;
  P_R: string;
  P_ER: string;
  P_H: string;
  P_TB: string;
  P_2B: string;
  P_3B: string;
  P_HR: string;
  P_HR4: string;
  P_BB: string;
  P_IBB: string;
  P_SO: string;
  P_GDP: string;
  P_HP: string;
  P_SH: string;
  P_SF: string;
  P_XI: string;
  P_WP: string;
  P_BK: string;
  P_IR: string;
  P_IRS: string;
  P_GO: string;
  P_AO: string;
  P_PITCH: string;
  P_STRIKE: string;

  // Allow additional fielding columns (F_*) we don't use
  [key: string]: string;
}

/**
 * Transform a RawPlayingRow to the internal batting format
 */
export function toBattingRow(row: RawPlayingRow): RawBattingRow {
  return {
    gid: row['game.key'],
    id: row['person.key'],
    team: row['team.key'],
    date: row['game.date'],
    number: row['game.number'],
    site: row['site.key'],
    vishome: row['team.alignment'] === '1' ? 'H' : 'V',
    opp: row['opponent.key'],
    b_pa: row.B_PA,
    b_ab: row.B_AB,
    b_r: row.B_R,
    b_h: row.B_H,
    b_d: row.B_2B,
    b_t: row.B_3B,
    b_hr: row.B_HR,
    b_rbi: row.B_RBI,
    b_sh: row.B_SH,
    b_sf: row.B_SF,
    b_hbp: row.B_HP,
    b_w: row.B_BB,
    b_iw: row.B_IBB,
    b_k: row.B_SO,
    b_sb: row.B_SB,
    b_cs: row.B_CS,
    b_gdp: row.B_GDP,
    b_xi: row.B_XI,
    b_roe: '', // Not available in retrosplits playing file
    dh: row.B_G_DH,
    ph: row.B_G_PH,
    pr: row.B_G_PR,
    win: '', // Not directly available per-player
    loss: '',
    tie: '',
    gametype: row['season.phase'],
    box: '',
    pbp: '',
    stattype: '',
    b_lp: row.slot,
    b_seq: row.seq,
  };
}

/**
 * Transform a RawPlayingRow to the internal pitching format
 */
export function toPitchingRow(row: RawPlayingRow): RawPitchingRow {
  return {
    gid: row['game.key'],
    id: row['person.key'],
    team: row['team.key'],
    date: row['game.date'],
    number: row['game.number'],
    site: row['site.key'],
    vishome: row['team.alignment'] === '1' ? 'H' : 'V',
    opp: row['opponent.key'],
    p_ipouts: row.P_OUT,
    p_noout: '', // Not available
    p_bfp: row.P_TBF,
    p_h: row.P_H,
    p_d: row.P_2B,
    p_t: row.P_3B,
    p_hr: row.P_HR,
    p_r: row.P_R,
    p_er: row.P_ER,
    p_w: row.P_BB,
    p_iw: row.P_IBB,
    p_k: row.P_SO,
    p_hbp: row.P_HP,
    p_wp: row.P_WP,
    p_bk: row.P_BK,
    p_sh: row.P_SH,
    p_sf: row.P_SF,
    p_sb: '', // Not directly available for pitchers
    p_cs: '', // Not directly available for pitchers
    p_pb: '', // Not available
    wp: row.P_W,
    lp: row.P_L,
    save: row.P_SV,
    gs: row.P_GS,
    gf: row.P_GF,
    cg: row.P_CG,
    win: '', // Not directly available per-player
    loss: '',
    tie: '',
    gametype: row['season.phase'],
    box: '',
    pbp: '',
    stattype: '',
    p_seq: row.seq,
  };
}

/**
 * Check if a row has batting stats (B_G > 0)
 */
export function hasBattingStats(row: RawPlayingRow): boolean {
  const bg = parseInt(row.B_G, 10);
  return !isNaN(bg) && bg > 0;
}

/**
 * Check if a row has pitching stats (P_G > 0)
 */
export function hasPitchingStats(row: RawPlayingRow): boolean {
  const pg = parseInt(row.P_G, 10);
  return !isNaN(pg) && pg > 0;
}

/**
 * @deprecated Use RawPlayingRow and toBattingRow instead
 * Raw batting row from retrosplits daybyday CSV
 * All fields are strings as they come from the CSV
 */
export interface RawBattingRow {
  gid: string;
  id: string; // player_id
  team: string;
  date: string;
  number: string;
  site: string;
  vishome: string;
  opp: string;
  b_pa: string;
  b_ab: string;
  b_r: string;
  b_h: string;
  b_d: string;
  b_t: string;
  b_hr: string;
  b_rbi: string;
  b_sh: string;
  b_sf: string;
  b_hbp: string;
  b_w: string;
  b_iw: string;
  b_k: string;
  b_sb: string;
  b_cs: string;
  b_gdp: string;
  b_xi: string;
  b_roe: string;
  dh: string;
  ph: string;
  pr: string;
  win: string;
  loss: string;
  tie: string;
  gametype: string;
  box: string;
  pbp: string;
  stattype: string;
  b_lp: string;
  b_seq: string;
  [key: string]: string;
}

/**
 * @deprecated Use RawPlayingRow and toPitchingRow instead
 * Raw pitching row from retrosplits daybyday CSV
 * All fields are strings as they come from the CSV
 */
export interface RawPitchingRow {
  gid: string;
  id: string; // player_id
  team: string;
  date: string;
  number: string;
  site: string;
  vishome: string;
  opp: string;
  p_ipouts: string;
  p_noout: string;
  p_bfp: string;
  p_h: string;
  p_d: string;
  p_t: string;
  p_hr: string;
  p_r: string;
  p_er: string;
  p_w: string;
  p_iw: string;
  p_k: string;
  p_hbp: string;
  p_wp: string;
  p_bk: string;
  p_sh: string;
  p_sf: string;
  p_sb: string;
  p_cs: string;
  p_pb: string;
  wp: string;
  lp: string;
  save: string;
  gs: string;
  gf: string;
  cg: string;
  win: string;
  loss: string;
  tie: string;
  gametype: string;
  box: string;
  pbp: string;
  stattype: string;
  p_seq: string;
  [key: string]: string;
}

// CSV column headers for batting
export const BATTING_COLUMNS = [
  'gid',
  'id',
  'team',
  'date',
  'number',
  'site',
  'vishome',
  'opp',
  'b_pa',
  'b_ab',
  'b_r',
  'b_h',
  'b_d',
  'b_t',
  'b_hr',
  'b_rbi',
  'b_sh',
  'b_sf',
  'b_hbp',
  'b_w',
  'b_iw',
  'b_k',
  'b_sb',
  'b_cs',
  'b_gdp',
  'b_xi',
  'b_roe',
  'dh',
  'ph',
  'pr',
  'win',
  'loss',
  'tie',
  'gametype',
  'box',
  'pbp',
  'stattype',
  'b_lp',
  'b_seq',
] as const;

// CSV column headers for pitching
export const PITCHING_COLUMNS = [
  'gid',
  'id',
  'team',
  'date',
  'number',
  'site',
  'vishome',
  'opp',
  'p_ipouts',
  'p_noout',
  'p_bfp',
  'p_h',
  'p_d',
  'p_t',
  'p_hr',
  'p_r',
  'p_er',
  'p_w',
  'p_iw',
  'p_k',
  'p_hbp',
  'p_wp',
  'p_bk',
  'p_sh',
  'p_sf',
  'p_sb',
  'p_cs',
  'p_pb',
  'wp',
  'lp',
  'save',
  'gs',
  'gf',
  'cg',
  'win',
  'loss',
  'tie',
  'gametype',
  'box',
  'pbp',
  'stattype',
  'p_seq',
] as const;
