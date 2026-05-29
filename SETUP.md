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

Create `backend/.env` with the following content:

```env
PORT=3000
DATABASE_URL=postgres://<your-mac-username>@localhost:5432/financemanager
GOOGLE_CLIENT_ID=403631851055-h3jvufar9n0gilc6hnsm6aq05kig4b4u.apps.googleusercontent.com
SESSION_SECRET=fm-dev-secret-a1b2c3d4e5f6g7h8i9j0
```

Replace `<your-mac-username>` with the output of `whoami`.

> **Note on Google OAuth:** The Client ID above is already configured in the Google Cloud Console for `http://localhost:3000`. No additional Google setup is needed — it will work out of the box.

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
│   ├── .env
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
| `net_worth_snapshots` | Net worth history per request |

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
