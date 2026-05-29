# FinanceManager — Local Setup

## Prerequisites

- **Node.js** v22 or later — [download](https://nodejs.org/)
- **PostgreSQL** 16 — [download](https://www.postgresql.org/download/) or via package manager:
  - macOS: `brew install postgresql@16`
  - Ubuntu/Debian: `sudo apt install postgresql postgresql-client`
  - Windows: [installer](https://www.postgresql.org/download/windows/)

## Step 1: Start PostgreSQL

Make sure PostgreSQL is running. Then create the database:

```bash
createdb financemanager
```

If `createdb` fails, your PostgreSQL may not be running or the user doesn't exist. Troubleshoot with:

```bash
pg_isready                # check if PostgreSQL is running
psql -U postgres -c "CREATE DATABASE financemanager;"  # alternative
```

## Step 2: Install backend dependencies

```bash
cd backend
npm install
```

## Step 3: Configure environment variables

Copy the example file:

```bash
cp backend/.env.example backend/.env
```

Then edit `backend/.env` with the secrets shared with you privately.

## Step 4: Start the server

```bash
cd backend
npm start
```

Or with auto-restart on file changes:
```bash
cd backend
npm run dev
```

## Step 5: Open the app

Visit **http://localhost:3000** in your browser.

Click **"Sign in with Google"** to log in. `http://localhost:3000` is already whitelisted in the project's Google OAuth settings — no additional setup needed.

## Project structure

```
financemanager/
├── backend/
│   ├── src/
│   │   ├── index.js          # Express server entry point
│   │   ├── db.js             # PostgreSQL connection pool
│   │   ├── schema.js         # Auto-creates tables on startup
│   │   ├── auth.js           # Google token verification
│   │   ├── middleware.js      # JWT auth middleware
│   │   ├── routes/
│   │   │   ├── auth.js       # POST /api/auth/google
│   │   │   ├── assets.js     # CRUD /api/assets
│   │   │   ├── liabilities.js # CRUD /api/liabilities
│   │   │   └── networth.js   # GET /api/net-worth
│   │   └── frontend/         # Served as static files
│   │       ├── index.html
│   │       ├── styles.css
│   │       └── app.js
│   ├── .env.example
│   └── package.json
├── requirements.md
└── SETUP.md
```

## Database tables

Created automatically on first startup:

| Table | Purpose |
|---|---|
| `users` | Google-authenticated users |
| `assets` | Manual asset entries per user |
| `liabilities` | Manual liability entries per user |
| `net_worth_snapshots` | Net worth history, recorded on data changes |

## API endpoints

| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/google` | No | Sign in with Google ID token |
| GET | `/api/auth/me` | Yes | Get current user profile |
| POST | `/api/auth/logout` | No | Logout |
| GET | `/api/assets` | Yes | List user's assets |
| POST | `/api/assets` | Yes | Create asset |
| PUT | `/api/assets/:id` | Yes | Update asset |
| DELETE | `/api/assets/:id` | Yes | Delete asset |
| GET | `/api/liabilities` | Yes | List user's liabilities |
| POST | `/api/liabilities` | Yes | Create liability |
| PUT | `/api/liabilities/:id` | Yes | Update liability |
| DELETE | `/api/liabilities/:id` | Yes | Delete liability |
| GET | `/api/net-worth` | Yes | Current net worth + history |
| GET | `/api/config` | No | Public config (Google Client ID) |

## Troubleshooting

**Port already in use:**
```bash
lsof -i:3000   # macOS — find what's using port 3000
kill -9 <PID>
```
Windows: `netstat -ano | findstr :3000` then `taskkill /PID <PID> /F`

**Database connection error:**
- Ensure PostgreSQL is running
- Run `createdb financemanager` if the database doesn't exist
- Verify the username in `DATABASE_URL` matches your system user or use `postgres://postgres:password@localhost:5432/financemanager`

**Server won't start:**
```bash
cd backend && npm install  # ensure all deps are installed
node src/index.js          # check for error output
```

**Google sign-in not working:**
- The project's Google Client ID already has `http://localhost:3000` whitelisted. Make sure you're accessing the app at that exact URL.
- Verify the `GOOGLE_CLIENT_ID` in your `backend/.env` matches what was shared with you.
