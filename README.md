# MLB Fantasy Baseball Data Pipeline

A TypeScript CLI and library for ingesting historical MLB game statistics and computing fantasy baseball points using configurable scoring systems.

## Features

- **Historical Data Ingestion**: Downloads and processes day-by-day player statistics from the Chadwick Bureau's retrosplits repository
- **Flexible Fantasy Scoring**: JSON-based scoring rulesets with support for bonuses and penalties
- **Incremental Updates**: Idempotent ingestion - re-running won't duplicate data
- **PostgreSQL Storage**: Robust relational database with proper constraints and indexes
- **CLI Interface**: Easy-to-use commands for ingestion, scoring, and querying

## Quick Start

### Prerequisites

- Node.js 20+
- Docker and Docker Compose (for PostgreSQL)

### Setup

```bash
# Install dependencies
npm install

# Start PostgreSQL
docker-compose up -d

# Run database migrations
npm run db:migrate

# Seed default ruleset
npm run cli seed
```

### Basic Usage

```bash
# Ingest data for 2023
npm run cli ingest -- -y 2023

# Calculate fantasy points
npm run cli score -- -r standard -y 2023

# View leaders
npm run cli query leaders -- -r standard -y 2023

# View player stats
npm run cli query player -- -p troutmi01 -r standard -y 2023
```

## CLI Commands

### `ingest`

Download and ingest Retrosheet data:

```bash
# Single year
npm run cli ingest -- -y 2023

# Year range
npm run cli ingest -- -y 2020-2023

# Multiple years
npm run cli ingest -- -y 2020,2021,2022

# Specific data type
npm run cli ingest -- -y 2023 -t batting

# Force re-ingestion
npm run cli ingest -- -y 2023 -f

# Run migrations before ingesting
npm run cli ingest -- -y 2023 --migrate
```

### `score`

Calculate fantasy points:

```bash
# Score entire year
npm run cli score -- -r standard -y 2023

# Score date range
npm run cli score -- -r standard --start-date 2023-04-01 --end-date 2023-04-30

# Force recalculation
npm run cli score -- -r standard -y 2023 -f
```

### `query`

Query data:

```bash
# Fantasy leaders
npm run cli query leaders -- -r standard -y 2023
npm run cli query leaders -- -r standard -y 2023 -t batting -n 50

# Player game log
npm run cli query player -- -p troutmi01 -r standard -y 2023

# Game details
npm run cli query game -- -g ANA202304010 -r standard

# Raw stats
npm run cli query stats -- -p troutmi01 -y 2023 -t batting
npm run cli query stats -- -p sandopa02 -y 2023 -t pitching
```

## Database Schema

```
┌─────────────────┐     ┌─────────────────┐
│     players     │     │      teams      │
├─────────────────┤     ├─────────────────┤
│ player_id (PK)  │     │ team_id (PK)    │
│ created_at      │     │ created_at      │
└────────┬────────┘     └────────┬────────┘
         │                       │
         │    ┌──────────────────┼──────────────────┐
         │    │                  │                  │
         ▼    ▼                  ▼                  │
┌─────────────────────────────────────┐            │
│               games                  │            │
├─────────────────────────────────────┤            │
│ game_id (PK)                        │            │
│ game_date, game_number, site        │            │
│ home_team_id (FK), away_team_id (FK)│            │
│ game_type, has_box, has_pbp         │            │
└────────────────┬────────────────────┘            │
                 │                                  │
    ┌────────────┼────────────┐                    │
    │            │            │                    │
    ▼            │            ▼                    │
┌──────────────┐ │ ┌────────────────┐              │
│batter_game   │ │ │pitcher_game    │              │
│   _stats     │ │ │   _stats       │              │
├──────────────┤ │ ├────────────────┤              │
│ id (PK)      │ │ │ id (PK)        │              │
│ game_id (FK) │ │ │ game_id (FK)   │              │
│ player_id FK │ │ │ player_id (FK) │              │
│ team_id (FK) │ │ │ team_id (FK)   │              │
│ [stats...]   │ │ │ [stats...]     │              │
│ stat_type    │ │ │ stat_type      │              │
└──────────────┘ │ └────────────────┘              │
                 │                                  │
                 ▼                                  │
┌─────────────────────────────────────┐            │
│        fantasy_rulesets             │            │
├─────────────────────────────────────┤            │
│ ruleset_id (PK)                     │            │
│ name, description                   │            │
│ batting_rules (JSONB)               │            │
│ pitching_rules (JSONB)              │            │
│ bonus_rules (JSONB)                 │            │
└────────────────┬────────────────────┘            │
                 │                                  │
                 ▼                                  │
┌─────────────────────────────────────┐            │
│       fantasy_game_points           │◄───────────┘
├─────────────────────────────────────┤
│ id (PK)                             │
│ ruleset_id (FK), game_id (FK)       │
│ player_id (FK), stat_type           │
│ total_points, breakdown (JSONB)     │
│ game_date, calculated_at            │
└─────────────────────────────────────┘
```

## Scoring Rulesets

Rulesets are defined in JSON with batting rules, pitching rules, and optional bonuses:

```json
{
  "id": "my-league",
  "name": "My Custom League",
  "batting": [
    { "stat": "runs", "points": 1 },
    { "stat": "hits", "points": 0.5 },
    { "stat": "home_runs", "points": 4 },
    { "stat": "runs_batted_in", "points": 1 },
    { "stat": "stolen_bases", "points": 2 },
    { "stat": "caught_stealing", "points": -1 },
    { "stat": "walks", "points": 1 },
    { "stat": "strikeouts", "points": -0.5 }
  ],
  "pitching": [
    { "stat": "outs_pitched", "points": 1, "perUnit": 3 },
    { "stat": "strikeouts", "points": 1 },
    { "stat": "won", "points": 5 },
    { "stat": "lost", "points": -3 },
    { "stat": "saved", "points": 5 },
    { "stat": "earned_runs", "points": -2 }
  ],
  "bonuses": [
    {
      "name": "Complete Game",
      "conditions": [{ "stat": "complete_game", "op": "eq", "value": 1 }],
      "logic": "AND",
      "points": 3
    }
  ]
}
```

### Available Stats

**Batting:**
- `plate_appearances`, `at_bats`, `runs`, `hits`
- `doubles`, `triples`, `home_runs`, `runs_batted_in`
- `sacrifice_hits`, `sacrifice_flies`, `hit_by_pitch`
- `walks`, `intentional_walks`, `strikeouts`
- `stolen_bases`, `caught_stealing`, `grounded_into_dp`

**Pitching:**
- `outs_pitched` (use `perUnit: 3` for innings)
- `batters_faced`, `hits_allowed`, `runs_allowed`, `earned_runs`
- `walks`, `intentional_walks`, `strikeouts`, `hit_batters`
- `wild_pitches`, `balks`, `home_runs_allowed`
- `won`, `lost`, `saved`, `game_started`, `game_finished`, `complete_game`

### Adding a Custom Ruleset

1. Create a JSON file in `src/scoring/presets/`:

```json
// src/scoring/presets/my-league.json
{
  "id": "my-league",
  "name": "My League Scoring",
  ...
}
```

2. Or insert directly into the database:

```sql
INSERT INTO fantasy_rulesets (ruleset_id, name, batting_rules, pitching_rules)
VALUES ('my-league', 'My League', '[...]'::jsonb, '[...]'::jsonb);
```

3. Use with CLI:

```bash
npm run cli score -- -r my-league -y 2023
```

## Development

```bash
# Run tests
npm test

# Run with coverage
npm run test:coverage

# Run integration tests (requires Docker)
npm run test:integration

# Type check
npm run typecheck

# Lint
npm run lint

# Format
npm run format
```

## Library Usage

```typescript
import {
  createClient,
  runMigrations,
  ingestYear,
  scoreGamesForYear,
  getOrLoadRuleset,
  getFantasyLeaderboard,
} from 'mlb-fantasy-pipeline';

// Create database client
const sql = createClient({
  host: 'localhost',
  port: 5432,
  user: 'mlb',
  password: 'mlb_dev_password',
  database: 'mlb_fantasy',
});

// Run migrations
await runMigrations(sql);

// Ingest data
await ingestYear(sql, 'batting', 2023);
await ingestYear(sql, 'pitching', 2023);

// Load ruleset and score
const ruleset = await getOrLoadRuleset(sql, 'standard');
await scoreGamesForYear(sql, ruleset!, 2023);

// Query results
const leaders = await getFantasyLeaderboard(sql, 'standard', { year: 2023 });
```

## Data Source & Licensing

This project uses data from the [Chadwick Bureau retrosplits repository](https://github.com/chadwickbureau/retrosplits), which is derived from [Retrosheet](https://www.retrosheet.org/).

### Retrosheet Notice

> The information used here was obtained free of charge from and is copyrighted by Retrosheet. Interested parties may contact Retrosheet at www.retrosheet.org.

### Usage Terms

Per [Retrosheet's terms](https://www.retrosheet.org/notice.txt), you are free to:
- Sell the data
- Give it away
- Produce commercial products based on the data

The only requirement is that the above Retrosheet notice must appear prominently in any distribution or product using the data.

## License

MIT License - see [LICENSE](LICENSE) for details.

Note: This license applies to the code only. The underlying data is subject to Retrosheet's terms.
