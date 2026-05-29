# FinanceManager — Requirements

A personal finance management web application inspired by INDmoney (https://indmoney.com). Tracks assets, liabilities, and net worth with a focus on Indian financial instruments. Designed to evolve from manual entry to fully automated data collection via India's Account Aggregator (AA) framework and public APIs.

---

## Phase 1 — Net Worth Tracker (Manual Entry)

### Goal
A functional single-page web application that lets users manually enter their assets and liabilities to calculate and track net worth over time. Establishes the data model and UI that all subsequent automated phases will plug into.

### Asset Types

| Asset Type | Fields | Example |
|---|---|---|
| **Indian Mutual Funds** | Fund name, folio number, units held, current NAV, investment date | HDFC Mid-Cap Opportunities Fund |
| **Cash** | Account name/nickname, currency, balance | HDFC Savings Account, INR 50,000 |
| **US Equity** | Ticker, company name, shares held, average buy price, currency (USD) | AAPL, 10 shares, $180 avg |
| **Provident Fund (PF)** | PF account number (UAN), employer, current balance, employee contribution | EPF A/c UAN xxxxx |
| **Fixed Deposits** | Bank name, FD number, principal, interest rate, start date, maturity date | SBI FD, ₹1L @ 7% |
| **Indian Stocks** | ISIN/ticker, company name, quantity, avg buy price | RELIANCE, 5 shares |
| **Gold** | Type (Sovereign/ETF/Physical), weight (grams), current rate/gm, quantity | Digital Gold, 10g |
| **Real Estate** | Property name, type (Residential/Commercial), estimated value, location | Apartment in Bangalore |
| **NPS** | PRAN, Tier (I/II), current balance, subscriber name | NPS Tier I account |
| **Other Assets** | Custom name, value, notes | Crypto, collectibles, etc. |

### Liability Types

| Liability Type | Fields | Example |
|---|---|---|
| **Credit Cards** | Card name, outstanding balance, due date, limit | HDFC Regalia, ₹12,000 |
| **Loans** | Loan type (Home/Car/Personal/Education), lender, principal, outstanding, EMI, interest rate, start date | Home Loan, ₹30L outstanding |
| **Other Liabilities** | Custom name, amount, notes | Borrowed from friend |

### Core Features

1. **Dashboard**
   - Current net worth (total assets − total liabilities)
   - Net worth trend (sparkline or mini chart)
   - Summary cards: Total Assets, Total Liabilities, Asset allocation pie/bar

2. **Asset Management (CRUD)**
   - Add new asset with type-specific form
   - Edit existing asset
   - Delete asset
   - List view with sorting by type, value, date

3. **Liability Management (CRUD)**
   - Add/edit/delete liabilities
   - List view

4. **Net Worth History**
   - Manual snapshots or auto-save on changes
   - Simple line chart showing net worth over time (weeks/months)

5. **Portfolio Summary**
   - Asset allocation by category (pie chart or bar chart)
   - Percentage breakdown

6. **Data Export**
   - Export all data as CSV/JSON

### Technical Stack (Recommended)

| Layer | Choice |
|---|---|
| **Frontend** | Vanilla JS or React (SPA) served by the backend |
| **Styling** | CSS with responsive design (mobile-friendly) |
| **Charts** | Chart.js or ApexCharts |
| **Backend** | Node.js/Express or Python/FastAPI |
| **Database** | PostgreSQL — already running on user's VM |
| **Auth** | Google Sign-In (OAuth 2.0) — free, no paid API keys needed |
| **Hosting** | User's existing VM — deploy via Docker or directly |

Phase 1 keeps the backend minimal: Google-only auth + CRUD persistence. No live data fetching, no AA integration, no external APIs.

### Google Sign-In — How It Works

**Why free:**
- Google OAuth 2.0 is free — only requires a Google Cloud Project (no billing needed for OAuth consent screen)
- Token verification uses Google's public JWK endpoint (https://www.googleapis.com/oauth2/v3/certs) — no API key, no cost
- No SMS, no email delivery, no third-party auth provider (no Firebase, no Auth0, no Clerk)

**Flow:**

```
1. User clicks "Sign in with Google" on the frontend
2. Frontend calls Google's OAuth (via Google Identity Services library / @react-oauth/google)
3. User picks their Google account and authorizes
4. Google returns an ID token (JWT signed by Google's private key)
5. Frontend sends the ID token to our backend POST /api/auth/google
6. Backend:
   a. Fetches Google's public keys from https://www.googleapis.com/oauth2/v3/certs
   b. Verifies the JWT signature, expiry, and audience (our client ID)
   c. Extracts email, name, and Google sub (unique user ID)
   d. Looks up user by email or creates a new user
   e. Issues a session token (JWT signed by our server) for subsequent API calls
7. Frontend stores the session token and redirects to the dashboard
```

**Required setup:**
- Google Cloud Console → Credentials → OAuth 2.0 Client ID (Web application)
- Add authorized JavaScript origins (your domain) and redirect URIs
- Copy the Client ID to the frontend, Client Secret to the backend
- All free, no credit card needed

### Core Backend Responsibilities

1. **User Registration & Login (Google only)**
   - No email/password signup — only "Sign in with Google"
   - On first sign-in, a user record is auto-created
   - On subsequent sign-ins, the existing user is looked up
   - Session token (JWT) issued server-side for API auth

2. **User-Scoped CRUD**
   - Every asset and liability is owned by a user (foreign key on user_id)
   - Authenticated endpoints only — no public access
   - Basic input validation on the server

3. **Data Persistence**
   - All assets, liabilities, and net worth history stored in PostgreSQL on the user's VM
   - User can access their data from any device after login

### API Endpoints (Backend)

```
POST   /api/auth/google          { id_token }  →  { session_token, user }
POST   /api/auth/logout

GET    /api/assets                list user's assets
POST   /api/assets                create asset
PUT    /api/assets/:id            update asset
DELETE /api/assets/:id            delete asset

GET    /api/liabilities            list user's liabilities
POST   /api/liabilities            create liability
PUT    /api/liabilities/:id        update liability
DELETE /api/liabilities/:id        delete liability

GET    /api/net-worth              current net worth + history
```

### Database Schema

```sql
CREATE TABLE users (
    id          TEXT PRIMARY KEY,          -- UUID
    google_sub  TEXT UNIQUE NOT NULL,      -- Google's unique user ID
    email       TEXT UNIQUE NOT NULL,
    name        TEXT NOT NULL,
    avatar_url  TEXT,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE assets (
    id          TEXT PRIMARY KEY,          -- UUID
    user_id     TEXT NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,             -- 'mutual_fund' | 'cash' | 'us_equity' | 'pf' | 'fd' | 'indian_stock' | 'gold' | 'real_estate' | 'nps' | 'other'
    name        TEXT NOT NULL,             -- display name
    data        TEXT NOT NULL,             -- JSON blob with type-specific fields
    value       REAL NOT NULL,             -- current value in INR (computed or manual)
    currency    TEXT DEFAULT 'INR',
    source      TEXT DEFAULT 'manual',     -- 'manual' | 'aa_sync' | 'api_sync' | 'file_import'
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE liabilities (
    id          TEXT PRIMARY KEY,          -- UUID
    user_id     TEXT NOT NULL REFERENCES users(id),
    type        TEXT NOT NULL,             -- 'credit_card' | 'loan' | 'other'
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,             -- JSON blob
    value       REAL NOT NULL,             -- outstanding amount in INR
    currency    TEXT DEFAULT 'INR',
    source      TEXT DEFAULT 'manual',
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE net_worth_snapshots (
    id          TEXT PRIMARY KEY,          -- UUID
    user_id     TEXT NOT NULL REFERENCES users(id),
    total_assets   REAL NOT NULL,
    total_liabilities REAL NOT NULL,
    net_worth    REAL NOT NULL,
    snapped_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### UI/UX Requirements

- Landing page: login/signup form (no public dashboard access)
- After login: clean dashboard as the main view
- Add/Edit forms with validation (numeric fields, required fields)
- Confirmation dialogs for deletions
- Responsive layout (works on mobile and desktop)
- Currency formatting (₹ for INR, $ for USD) based on asset type
- Total net worth prominently displayed at the top
- Every asset/liability has a `source` tag: `manual` | `aa_sync` | `api_sync` | `file_import` — this is critical for later phases where auto-synced and manual entries coexist
- Logout option in the header/nav

### Out of Scope (Phase 1)

- Email verification / password reset / OAuth
- Live NAV / stock price fetching
- Bank/folio auto-linking
- SIP tracking
- Goal planning
- Family/shared accounts
- Bill payments
- Admin panel

---

## Phase 2 — Automated Data Collection via Account Aggregator (AA) Framework

### Research: India's Account Aggregator Ecosystem

The **Account Aggregator (AA)** framework is an RBI-regulated consent-based data-sharing system. It acts as the financial data backbone in India — comparable to what Plaid does in the US.

**Key Stats (as of May 2026):**
- 17 licensed Account Aggregators (Setu, PhonePe, Anumati/Perfios, Finvu, OneMoney, NPS, Fold, etc.)
- 179+ Financial Information Providers (FIPs) — banks, MFs, insurers, depositories, EPFO, NPS, etc.
- 955+ Financial Information Users (FIUs) — apps consuming data
- 272M+ bank accounts linked
- 408M+ consent requests fulfilled
- 265M+ monthly data shares

**How the AA flow works:**
```
User → FinanceManager (FIU) → redirects to AA app → User gives consent
→ AA fetches data from FIP (bank/MF/EPFO etc.) → data delivered to FinanceManager
```

**AA Architecture Components:**
1. **Central Registry** — directory of all participants (FIPs, AAs, FIUs). Sahamati manages it.
2. **Consent Manager** — user controls which data, for how long, with whom to share
3. **Data API** — encrypted data transfer between FIP → AA → FIU
4. **Encryption** — TLS 1.2+, digital signatures, data-at-rest encryption
5. **Identification** — consent artefacts using JWT tokens

**Sahamati** (https://sahamati.org.in) is the industry alliance governing the AA ecosystem. Our app needs to register as an FIU via Sahamati certification process.

### Asset-Specific Data Sources

| Asset Type | Data Source | Collection Method |
|---|---|---|
| **Bank Accounts (Savings, FD)** | AA Framework — all major banks are FIPs (SBI, HDFC, ICICI, Axis, etc.) | User consents via AA app → bank balance, FD details auto-fetched |
| **Mutual Funds** | AA + MFCentral (CAMS + KFintech are FIPs). MFCentral is the unified MF portal that aggregates folios across all AMCs. | User provides PAN or folio details → AA fetches holdings, NAV, units |
| **Indian Stocks** | AA — CDSL/NSDL (depositories) are FIPs. Also NSE/BSE via public APIs. | AA fetches demat holdings. NSE/BSE APIs for live prices. |
| **US Equity** | No AA coverage yet. Use Yahoo Finance / Alpha Vantage / Twelve Data APIs. | API key-based. User enters tickers, app fetches prices periodically. |
| **EPF (PF)** | AA — EPFO is an FIP on the AA network. Also available via EPFO passbook portal (UMANG API). | AA consent → EPFO passbook data. Fallback: UMANG API. |
| **NPS** | AA — PFRDA / NPS Trust is an FIP on the AA network. | AA consent → NPS Tier I & Tier II balances. |
| **Credit Cards** | AA — banks are FIPs. Credit card outstanding is available as a liability data type. | AA consent → credit card statements, outstanding. |
| **Loans** | AA — banks and NBFCs are FIPs. Loan outstanding and EMI details available. | AA consent → loan account data. |
| **Gold** | No direct AA coverage. MCX API for gold rates + manual weight entry. | Manual quantity + MCX/BSE API for live gold rates. |
| **Real Estate** | No automated source. Manual entry only. | User estimates value. |
| **Insurance** | AA — insurance companies are FIPs. Policy details, surrender value available. | AA consent → policy data. |

### Recommended AA Providers (to integrate with)

These AAs offer developer-friendly APIs/SDKs:

| AA Provider | Website | Notes |
|---|---|---|
| **Setu (Agya Technologies)** | https://setu.co | Most popular, good docs, REST APIs, sandbox available |
| **PhonePe AA** | https://www.phonepe.com | Large user base, UPI integration |
| **Finvu** | https://finvu.in | Focus on developer experience |
| **OneMoney** | https://www.onemoney.in | CAMS-backed, strong MF data capabilities |
| **Anumati (Perfios)** | https://anumati.perfios.com | Enterprise-grade |

### Implementation Roadmap for Phase 2

**Step 1: Register as FIU**
- Register FinanceManager as a Financial Information User with Sahamati
- Get certified (Sahamati certifier program)
- Obtain FIU credentials, public/private key pair
- Onboard with one AA provider (recommended: Setu or Finvu for developer-friendly onboarding)

**Step 2: Backend Infrastructure**
- Set up backend: Node.js/NestJS or Python/FastAPI
- Database: PostgreSQL (encrypted at rest)
- API: REST + WebSocket for real-time sync updates
- Store user consent artefacts, access tokens (encrypted)
- Cron jobs for periodic data refresh based on consent validity

**Step 3: Consent Flow UI**
- User selects data sources (banks, MFs, EPFO, NPS, etc.)
- App redirects to AA app (mobile/web) for consent
- User authenticates on AA app, selects account types, sets consent duration
- Callback URL receives consent artefact
- App stores consent and triggers first data fetch

**Step 4: Data Fetch & Mapping**
- For each consent, call AA Data API to fetch financial information
- Map response fields to our asset/liability data model
- Store with `source: 'aa_sync'` tag
- Display in dashboard alongside manual entries, with sync status indicator

**Step 5: Refresh & Revoke**
- Scheduled refresh (daily/weekly) for active consents
- Allow users to view active consents and revoke them
- Handle consent expiry gracefully

### Live Price/NAV APIs (No AA needed)

These are used regardless of AA for current valuations:

| Data | API Source | Cost |
|---|---|---|
| **Mutual Fund NAV** | https://www.mfapi.in (unofficial, free) or BSE Star MF API | Free |
| **Indian Stock Prices** | NSE/BSE public feeds or https://www.alphavantage.co | Free tier available |
| **US Stock Prices** | Yahoo Finance (unofficial), Alpha Vantage, Twelve Data, IEX Cloud | Free tier available |
| **Gold Rates** | https://www.goldapi.io or MCX | Paid |
| **Forex (USD/INR)** | Free: exchangerate-api.com or RBI reference rates | Free |

### Data Ingress Methods (for users already on other platforms)

| Method | How |
|---|---|
| **CSV/Excel Import** | User uploads CSV from broker (Zerodha, Groww, Coin, etc.) |
| **PAN-based MF fetch** | MFCentral API using PAN to discover all folios |
| **Email Parsing** | With user consent, parse MF transaction emails (like INDmoney does) |
| **UMANG API** | EPFO passbook, NPS details via UMANG digital platform |

### Out of Scope (Phase 2)

- Live brokerage integration for trading
- Bill payments / UPI
- Goal planning
- Family/shared net worth

---

## Phase 3 — Live Data & Backend Integration

- Backend API (Node.js / Python FastAPI + PostgreSQL)
- User authentication (JWT / OAuth 2.0)
- Live NAV fetching for mutual funds (mfapi.in / BSE Star MF)
- Live US stock prices (Alpha Vantage / Yahoo Finance)
- Live Indian stock prices (NSE/BSE APIs)
- Gold rate API integration
- Cloud sync across devices
- Data import (CSV upload from other platforms)

---

## Phase 4 — Advanced Features

- SIP calculator, retirement planner, EMI calculator
- Goal-based investing (track progress toward goals)
- Portfolio XIRR / returns calculation
- Portfolio rebalancing suggestions
- Family net worth tracking (multi-user)
- Reports: capital gains, dividend tracking, tax statements
- Email/SMS alerts for milestones
- Dark mode & themes
- Export to PDF (net worth report)

---

## Phase 5 — Brokerage & Transactions

- Link brokerage accounts (Zerodha, Groww, Angel One, etc.)
- Transaction history import via AA or direct broker APIs
- Real-time P&L tracking
- MTF (Margin Trading Facility) tracking
- IPO tracking
- F&O position tracking
- Automated categorization of transactions

---

## Phase 6 — Payments & UPI

- UPI payment integration (NPCI UPI API / third-party PSP)
- Credit card bill payment & reminders
- Cashback tracking
- Expense categorization
- Budgeting module
- Recurring payment tracking

---

## Appendix A: AA Integration Checklist

- [ ] Register entity as FIU with Sahamati
- [ ] Get Sahamati certification
- [ ] Generate RSA key pair for signing requests
- [ ] Generate SSL/TLS certificates
- [ ] Integrate with Central Registry API for participant discovery
- [ ] Integrate with AA provider's Consent API
- [ ] Implement user consent flow (redirect + callback)
- [ ] Integrate with AA provider's Data API for each FIP type
- [ ] Implement data decryption and mapping
- [ ] Store consents and access tokens securely
- [ ] Implement consent refresh and revocation
- [ ] Compliance: data privacy, consent records, audit logs

## Appendix B: Glossary

| Term | Meaning |
|---|---|
| **AA** | Account Aggregator — RBI-licensed NBFC that facilitates consent-based data sharing |
| **FIP** | Financial Information Provider — entity holding user data (bank, MF, depository, etc.) |
| **FIU** | Financial Information User — entity consuming data with user consent (our app) |
| **Sahamati** | Industry alliance governing the AA ecosystem in India |
| **Consent Artefact** | Digital token representing user's consent (duration, purpose, data types) |
| **Central Registry** | Directory of all AA ecosystem participants managed by Sahamati |
| **MFCentral** | Unified portal by CAMS + KFintech for all mutual fund folio management |
| **UAN** | Universal Account Number — EPFO's unique identifier for PF accounts |
| **PRAN** | Permanent Retirement Account Number — NPS account identifier |
