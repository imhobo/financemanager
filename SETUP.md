# FinanceManager — Local Setup

## Prerequisites

- macOS (these instructions are for macOS via Homebrew)
- Terminal access

## Step 1: Install PostgreSQL

```bash
brew install postgresql@16
brew services start postgresql@16
```

Verify it's running:
```bash
pg_isready
# expected output: /tmp:5432 - accepting connections
```

## Step 2: Install Node.js

```bash
brew install node
```

Verify:
```bash
node --version   # v22.x or later
npm --version    # 10.x or later
```

## Step 3: Create the database

```bash
createdb financemanager
```

## Step 4: Install backend dependencies

```bash
cd backend
npm install
```

## Step 5: Configure environment variables

Copy the example env file and edit it:

```bash
cp backend/.env.example backend/.env
```

Edit `backend/.env` and fill in these values:

| Variable | How to get it |
|---|---|
| `DATABASE_URL` | Run `whoami` to get your macOS username. Replace `YOUR_MAC_USERNAME` in `postgres://YOUR_MAC_USERNAME@localhost:5432/financemanager` |
| `GOOGLE_CLIENT_ID` | Ask the team for the shared project Client ID. It's already configured in Google Cloud Console — just make sure your local URL (e.g. `http://localhost:3000`) is added to the authorized JavaScript origins by someone with GCP access. This is a one-time setup per developer. |
| `SESSION_SECRET` | Any random string (e.g. run `openssl rand -hex 32`) |

Example after filling:
```env
PORT=3000
DATABASE_URL=postgres://john@localhost:5432/financemanager
GOOGLE_CLIENT_ID=1234567890-xxxxx.apps.googleusercontent.com
SESSION_SECRET=6a8b2c3d4e5f67890abcdef1234567890
```

> **Tip:** Keep this file private — it contains secrets. It's already listed in `.gitignore` so it won't be committed to GitHub.

## Step 6: Start the server

```bash
cd backend
npm start
```

Or with auto-restart on file changes:
```bash
cd backend
npm run dev
```

## Step 7: Open the app

Visit **http://localhost:3000** in your browser.

Click **"Sign in with Google"** to log in. After authentication, you'll see the dashboard where you can add assets and liabilities manually.

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
lsof -i:3000   # find what's using port 3000
kill -9 <PID>  # kill it, then restart
```

**Database connection error:**
```bash
brew services restart postgresql@16
createdb financemanager  # if it doesn't exist yet
```

**Server won't start:**
```bash
cd backend && npm install  # ensure all deps are installed
node src/index.js          # check for error output
```

**Google sign-in not working:**
- Make sure `http://localhost:3000` is added to the authorized JavaScript origins in your Google Cloud Console OAuth settings
- Verify the Client ID in `backend/.env` matches what's in the Google Cloud Console
