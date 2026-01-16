/**
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
}

/**
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
