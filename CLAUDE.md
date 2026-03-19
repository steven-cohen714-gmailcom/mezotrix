# Jayce — Mezotrix Financial Reporting Portal

A Node.js web app that connects to a **SQL Server** database (the Mezotrix ERP) and serves financial reports through a browser-based dashboard.

## Tech stack

- **Backend:** Express.js 5, CommonJS modules
- **Database:** Microsoft SQL Server via the `mssql` npm package
- **Auth:** Session-based password login (bcryptjs hashed password stored in env)
- **Frontend:** Vanilla HTML/CSS/JS (no framework)

## Prerequisites

- **Node.js** (LTS recommended)
- **Docker Desktop** (for SQL Server)
- The **Mezotrix** database with its tables (`PostGL`, `Accounts`, `PostAR`, `Client`, `PostAP`, `_etblStockQtys`, `_etblStockCosts`)

## Docker — SQL Server

The database runs in a Docker container named `mezotrix-restore` (image: `mssql/server:2022-latest`, port `1433`).

Start it before working on the project:

```bash
docker start mezotrix-restore
```

To verify it's running: `docker ps --filter name=mezotrix-restore`

## Setup & run

```bash
docker start mezotrix-restore   # start the database
npm install
cp .env.example .env            # then fill in real values
npm start                       # runs: node server.js
```

Server runs on port **4000** (`PORT=4000` in `.env`). Always use port 4000.

## Environment variables

| Variable | Purpose |
|----------|---------|
| `DB_HOST` | SQL Server hostname (e.g. `localhost`) |
| `DB_PORT` | SQL Server port (default `1433`) |
| `DB_USER` | Database user |
| `DB_PASSWORD` | Database password |
| `DB_NAME` | Database name (`Mezotrix`) |
| `SESSION_SECRET` | Express session secret |
| `LOGIN_PASSWORD_HASH` | bcrypt hash of the login password |
| `PORT` | HTTP port for the Express server |

## Project structure

```
server.js                   # Express app, API routes, entry point
src/
  db.js                     # SQL Server connection pool (mssql)
  auth.js                   # Login/logout/session middleware
  queries/
    pnl.js                  # Profit & Loss
    revenue-trend.js        # Monthly revenue trend
    cash-position.js        # Bank account balances
    working-capital.js      # Working capital metrics
    top-customers.js        # Top 10 customers by revenue
    ar-aging.js             # Accounts receivable aging buckets
    top-expenses.js         # Top 10 expense categories
public/
  index.html                # Login page
  dashboard.html            # Report dashboard
  js/
    app.js                  # Dashboard logic, auth checks, menu
    reports.js              # Report definitions & HTML renderers
    formatters.js           # Currency/number formatting
  css/
    style.css
```

## API

All report data is fetched via a single authenticated endpoint:

```
GET /api/report/all?from=YYYY-MM-DD&to=YYYY-MM-DD&compare=true|false
```

Auth routes: `POST /api/login`, `POST /api/logout`, `GET /api/me`

## Key details

- All 7 report queries run in parallel via `Promise.all`
- Year-over-year comparison shifts dates back 12 months and runs a second batch
- Connection pooling: max 10 connections, 30s idle timeout
- Sessions expire after 24 hours
