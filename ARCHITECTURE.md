# MLB Fantasy Baseball System Architecture

## Overview

A full-stack application for ingesting historical MLB baseball statistics, calculating fantasy points using configurable scoring rulesets, and exploring the data through a web dashboard.

## System Components

### 1. Database (PostgreSQL 16)

**Container**: `mlb-fantasy-db`
**Port**: 5432
**Technology**: PostgreSQL 16 Alpine

#### Tables

| Table | Description | Approximate Size |
|-------|-------------|------------------|
| `players` | Player IDs and names | ~20K rows |
| `teams` | Team IDs | ~150 rows |
| `games` | Game metadata (date, teams, site) | ~220K rows |
| `batter_game_stats` | Per-game batting statistics | ~3.7M rows |
| `pitcher_game_stats` | Per-game pitching statistics | ~800K rows |
| `fantasy_rulesets` | Scoring rule definitions (JSONB) | ~5 rows |
| `fantasy_game_points` | Calculated fantasy points per player/game | Variable |
| `ingestion_batches` | Tracks data ingestion status | ~250 rows |

#### Key Relationships

- `batter_game_stats` → `games` (game_id)
- `batter_game_stats` → `players` (player_id)
- `batter_game_stats` → `teams` (team_id)
- `pitcher_game_stats` → `games`, `players`, `teams` (same pattern)
- `fantasy_game_points` → `games`, `players`, `fantasy_rulesets`

---

### 2. API Server (Fastify)

**Directory**: `/api`
**Port**: 3001
**Technology**: Fastify + TypeScript

#### Endpoints

##### Players
- `GET /api/players/search?q=<query>` - Search players by ID or name
- `GET /api/players/:id` - Get player details
- `GET /api/players/:id/batting-stats?year=` - Get batting game log
- `GET /api/players/:id/pitching-stats?year=` - Get pitching game log
- `GET /api/players/:id/fantasy-points?ruleset=&year=` - Get fantasy points

##### Games
- `GET /api/games/:id` - Get game details with all player stats
- `GET /api/games?date=&limit=` - List games by date

##### Fantasy
- `GET /api/fantasy/rulesets` - List available scoring rulesets
- `GET /api/fantasy/leaderboard?ruleset=&year=&type=&limit=` - Get leaderboard
- `GET /api/fantasy/top?ruleset=&date=&monthDay=&yearStart=&yearEnd=` - Top performances

##### Search
- `GET /api/search?q=<query>` - Unified search (players, teams)
- `GET /api/years` - List years with data
- `GET /api/teams` - List all teams

#### File Structure

```
api/
├── src/
│   ├── server.ts        # Fastify server setup with CORS
│   ├── index.ts         # Entry point
│   ├── db/
│   │   └── client.ts    # PostgreSQL connection
│   └── routes/
│       ├── players.ts   # Player endpoints
│       ├── games.ts     # Game endpoints
│       ├── fantasy.ts   # Fantasy scoring endpoints
│       └── search.ts    # Search and metadata endpoints
├── package.json
└── tsconfig.json
```

---

### 3. Web Dashboard (React)

**Directory**: `/web`
**Port**: 5173 (dev)
**Technology**: React 18 + Vite + TypeScript

#### UI Framework
- **Styling**: Tailwind CSS
- **Components**: shadcn/ui (Radix UI primitives)
- **Data Fetching**: TanStack Query (React Query)
- **Routing**: React Router v6

#### Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | `HomePage` | Dashboard with quick links, top performers, "This Day in History" |
| `/leaderboards` | `LeaderboardPage` | Filterable fantasy leaderboard table |
| `/players/:id` | `PlayerPage` | Player profile with stats, game log, charts |
| `/games/:id` | `GamePage` | Game details with batting/pitching box scores |
| `/explore` | `DateExplorerPage` | Browse by date, "This Day in History" queries |
| `/query` | `QueryBuilderPage` | Custom queries with filters, CSV export |

#### File Structure

```
web/
├── src/
│   ├── main.tsx              # React entry point
│   ├── App.tsx               # Router setup
│   ├── api/
│   │   └── client.ts         # API client with TypeScript types
│   ├── components/
│   │   ├── ui/               # shadcn/ui components (button, card, table, etc.)
│   │   ├── layout/
│   │   │   ├── Layout.tsx    # Main layout with nav
│   │   │   └── SearchBar.tsx # Global search
│   │   └── StatLine.tsx      # Formatted stat display
│   └── pages/
│       ├── HomePage.tsx
│       ├── LeaderboardPage.tsx
│       ├── PlayerPage.tsx
│       ├── GamePage.tsx
│       ├── DateExplorerPage.tsx
│       └── QueryBuilderPage.tsx
├── package.json
├── vite.config.ts
├── tailwind.config.js
└── tsconfig.json
```

---

### 4. CLI Tool

**Directory**: `/src` (root package)
**Technology**: TypeScript + Commander.js

#### Commands

| Command | Description | Example |
|---------|-------------|---------|
| `ingest` | Download and ingest Retrosheet data | `npm run cli ingest -- -y 2023` |
| `score` | Calculate fantasy points | `npm run cli score -- -r standard -y 2023` |
| `query leaders` | View fantasy leaderboard | `npm run cli query leaders -- -r standard` |
| `query player` | View player stats | `npm run cli query player -- -p bondsba01` |
| `query game` | View game details | `npm run cli query game -- -g NYA202304010` |
| `query top` | Top performances by date | `npm run cli query top -- -r standard -d 07-04` |
| `seed` | Seed default rulesets | `npm run cli seed` |
| `sync-players` | Sync player names from Chadwick register | `npm run cli sync-players` |

#### Data Ingestion Pipeline

1. **Download**: Fetch CSV from `github.com/chadwickbureau/retrosplits`
2. **Stage**: Load raw rows into `staging_batting` / `staging_pitching` tables
3. **Transform**: Parse, deduplicate, upsert into typed tables
4. **Score**: Apply ruleset to calculate fantasy points

---

### 5. Data Source

**Source**: Chadwick Bureau retrosplits repository
**URL**: `https://github.com/chadwickbureau/retrosplits`
**Original Data**: Retrosheet (retrosheet.org)

#### Data Format

- One CSV file per year: `playing-YYYY.csv`
- Each row contains both batting and pitching stats for a player-game
- Years available: 1871-2025 (with gaps in early years)

#### Key Statistics Tracked

**Batting**: PA, AB, R, H, 2B, 3B, HR, RBI, BB, IBB, SO, SB, CS, HBP, SF, SH, GDP

**Pitching**: IP (as outs), BF, H, R, ER, BB, IBB, SO, HR, HBP, WP, BK, W, L, SV, GS, GF, CG

---

## Project Structure

```
baseball/
├── package.json              # Root package with workspaces
├── docker-compose.yml        # PostgreSQL containers
├── api/                      # Fastify API server
├── web/                      # React dashboard
├── src/                      # Core library + CLI
│   ├── cli.ts               # CLI entry point
│   ├── commands/            # CLI command handlers
│   ├── db/
│   │   ├── client.ts        # Database connection
│   │   ├── migrations/      # SQL migrations
│   │   └── queries/         # Query functions
│   ├── ingest/              # Data ingestion pipeline
│   ├── scoring/             # Fantasy scoring engine
│   │   └── presets/         # Ruleset JSON files
│   └── types/               # TypeScript type definitions
├── data/                     # Downloaded CSV files (gitignored)
└── tests/                    # Test files
```

---

## Running the Application

### Prerequisites
- Node.js 20+
- Docker and Docker Compose

### Development

```bash
# Start database
docker-compose up -d

# Install dependencies
npm install

# Run migrations
npm run db:migrate

# Seed rulesets
npm run cli seed

# Ingest data (example: 2023)
npm run cli ingest -- -y 2023

# Score data
npm run cli score -- -r standard -y 2023

# Start API + Web
npm run dev:all
```

### Ports

| Service | Port |
|---------|------|
| PostgreSQL | 5432 |
| PostgreSQL (test) | 5433 |
| API Server | 3001 |
| Web Dashboard | 5173 |

---

## Scoring System

Fantasy points are calculated using configurable rulesets stored as JSONB in the database.

### Ruleset Structure

```json
{
  "id": "standard",
  "name": "Standard Scoring",
  "batting": [
    { "stat": "runs", "points": 1 },
    { "stat": "hits", "points": 0.5 },
    { "stat": "home_runs", "points": 4 },
    { "stat": "runs_batted_in", "points": 1 },
    { "stat": "stolen_bases", "points": 2 },
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
      "points": 3
    }
  ]
}
```

---

## Data Licensing

Data is sourced from Retrosheet via the Chadwick Bureau. Per Retrosheet's terms:
- Commercial use is permitted
- Attribution required: "The information used here was obtained free of charge from and is copyrighted by Retrosheet."

See: https://www.retrosheet.org/notice.txt
