# AI Finance Manager — Production-Grade Financial Intelligence Platform

[![CI / CD Pipeline](https://github.com/your-org/ai-finance-manager/actions/workflows/ci.yml/badge.svg)](https://github.com/your-org/ai-finance-manager/actions)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-green.svg)](https://nodejs.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.22-2D3748.svg)](https://www.prisma.io/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1.svg)](https://www.mysql.com/)
[![Playwright](https://img.shields.io/badge/Playwright-1.48+-2EAD33.svg)](https://playwright.dev/)
[![Gemini](https://img.shields.io/badge/Google%20Gemini-API%20Ready-orange.svg)](https://ai.google.dev/)

An enterprise-ready, full-stack personal finance platform engineered for data integrity, multi-account ledger accuracy, real-time analytics, and secure AI-assisted financial advisory grounded exclusively in verified user records.

---

## Table of Contents

1. [Architectural Overview](#architectural-overview)
2. [Technology Stack](#technology-stack)
3. [Core Capabilities & Features](#core-capabilities--features)
4. [Prerequisites & System Requirements](#prerequisites--system-requirements)
5. [Local Development Setup](#local-development-setup)
6. [Environment Variables Reference](#environment-variables-reference)
7. [Automated Testing Suite](#automated-testing-suite)
   - [Backend Unit & Integration Tests (174 Tests)](#backend-unit--integration-tests-174-tests)
   - [Playwright End-to-End User Journeys (11 Journeys)](#playwright-end-to-end-user-journeys-11-journeys)
8. [Security & Financial Integrity Architecture](#security--financial-integrity-architecture)
9. [Production Deployment with Docker](#production-deployment-with-docker)
10. [Database Backup & Recovery Procedures](#database-backup--recovery-procedures)
11. [CI/CD Workflow](#cicd-workflow)
12. [Verification Matrix & Phase Status](#verification-matrix--phase-status)

---

## Architectural Overview

```
                      +---------------------------------------+
                      |       React 19 + Vite Frontend        |
                      |   (Tailwind CSS, Lucide, Recharts)    |
                      +-------------------+-------------------+
                                          |
                                          | HTTPS / REST + HttpOnly Cookie
                                          v
                      +---------------------------------------+
                      |      Express + TypeScript Backend     |
                      |  - Helmet, CORS, Rate Limiters        |
                      |  - JWT Auth & Token Family Rotation   |
                      |  - Zod Request Validators             |
                      +-------------------+-------------------+
                                          |
                +-------------------------+-------------------------+
                |                                                   |
                v                                                   v
+-------------------------------+               +-------------------------------+
|      Prisma 5.22 ORM          |               |   AI Assistant Controller     |
|  - Atomic Database Operations |               |  - Gemini 2.5 Flash SDK       |
|  - High-Precision DECIMAL     |               |  - Controlled Read-Only Tools |
|  - Overdraft & Safe Deletion  |               |  - Strict Session Identity    |
+---------------+---------------+               +---------------+---------------+
                |                                               |
                v                                               v
+-------------------------------+               +-------------------------------+
|      MySQL 8.0 Database       |               |     Google Gemini API         |
|  - InnoDB ACID Transactions   |               |  (Read-only telemetry via     |
|  - Strict Foreign Key Cascade |               |   controlled backend tools)   |
+-------------------------------+               +-------------------------------+
```

---

## Technology Stack

- **Frontend Client**:
  - React 19 with strict TypeScript
  - Vite for ultra-fast bundling and HMR
  - Tailwind CSS for modern responsive styling
  - Axios with automated interceptors for transparent access token renewal
  - React Router v7 with declarative route guards (`ProtectedRoute`)
  - Recharts for financial cash flow and monthly trend visualizations
  - Lucide React for clean iconography

- **Backend API**:
  - Node.js 20+ with Express
  - TypeScript in strict compilation mode (`noImplicitAny`, `strictNullChecks`)
  - Prisma ORM 5.22 with singleton connection pooling
  - Zod 3.23 for runtime schema validation on all incoming inputs
  - Bcrypt.js with 12 salt rounds for password hashing
  - JSON Web Tokens (15-minute short-lived access tokens + 7-day rotated refresh tokens)
  - Express Rate Limit and Helmet for perimeter network defenses
  - Nodemailer for email OTP delivery (with local dev simulator)

- **AI Engine**:
  - Official `@google/genai` SDK
  - Model: `gemini-2.5-flash`
  - Controlled read-only function tools (zero write capabilities)

- **Database**:
  - MySQL 8.0 InnoDB
  - Precise monetary arithmetic (`DECIMAL(14, 2)`)

- **Testing & Quality Assurance**:
  - TSX and native Node.js test runner for unit & integration testing
  - Playwright for multi-browser end-to-end user journey validation

---

## Core Capabilities & Features

### 1. Authentication & Identity Management
- **Registration**: User signup with name, email, and password strength enforcement.
- **1-Minute Cryptographic OTP**: Cryptographically secure 6-digit OTP stored as SHA-256 hashes, with 5-attempt brute-force protection and prior code invalidation.
- **JWT Rotation & Reuse Detection**: Short-lived 15m access tokens and 7-day HttpOnly refresh cookies. Token family revocation is automatically triggered upon replay attacks.
- **Password Reset**: Scoped single-use OTP reset flow invalidating all existing refresh sessions.
- **Role-Based Access Control (RBAC)**: Distinguishes between `USER` and `ADMIN` permissions.

### 2. Financial Accounts Ledger
- Supports `BANK`, `SAVINGS`, `CASH`, `WALLET`, `CREDIT_CARD`, and `OTHER` accounts.
- Initial opening balance configuration and live balance aggregation.
- Database-level atomic increments and decrements to eliminate race conditions under concurrent updates.
- Safe deletion guards: Accounts with recorded transactions cannot be silently deleted, protecting financial history.

### 3. Categories & Double-Entry Transactions
- Income and Expense category taxonomy (Default system categories + user custom categories).
- Transaction types: `INCOME` (credit), `EXPENSE` (debit), and `TRANSFER` (double-entry transfer between accounts).
- Transfers are balance-neutral and strictly excluded from income/expense cash flow summaries.
- Account balance restoration upon transaction editing or deletion.
- Comprehensive search, category filtering, type filtering, date range slicing, and pagination.

### 4. Budgets & Savings Goals
- Monthly expense limits per category with duplicate prevention.
- Real-time spending calculation directly from transaction records (no stale cached figures).
- Health status categorization: `ON_TRACK` (<80%), `APPROACHING` (80%–100%), and `EXCEEDED` (>100%).
- Milestone savings goals tracking target amount, saved funds, and target deadlines with automated monthly savings rate calculations.

### 5. Financial Analytics Dashboard
- Aggregated cash flow: Total Income, Total Expenses, Net Surplus, and Savings Rate.
- 6-month monthly trends comparing income vs expenses with safe Month-over-Month (MoM) calculation handling zero denominators.
- Account reserves breakdown grouped strictly by currency.

### 6. Secure AI Financial Assistant
- Grounded strictly in authenticated user data via 7 controlled read-only tools:
  1. `getFinancialSummary`: Cash flow and savings rate.
  2. `getCategorySpending`: Category spending distribution with percentage share.
  3. `compareMonthlySpending`: Side-by-side period comparisons.
  4. `getAccountBalances`: Currency-grouped accounts and balances.
  5. `getBudgetStatus`: Monthly budget limits and utilization alerts.
  6. `getSavingsGoals`: Savings milestone progress.
  7. `getRecentTransactions`: Recent ledger records (capped at 30).
- Zero mutation permissions: AI cannot create, modify, or delete accounts, transactions, or budgets.
- Session-derived user identity: The AI cannot query another user's financial data.
- Built-in prompt injection defense: Strips system role escapes and validates assistant output.

---

## Prerequisites & System Requirements

- **Node.js**: v20.x or higher
- **npm**: v10.x or higher
- **MySQL**: 8.0+ running on `localhost:3306` (or via Docker)
- **Git**

---

## Local Development Setup

### 1. Clone the Repository
```bash
git clone https://github.com/your-org/ai-finance-manager.git
cd ai-finance-manager
```

### 2. Configure Environment Variables

Create `server/.env` based on `server/.env.example`:
```env
# Server Runtime
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# MySQL Database
DATABASE_URL=mysql://root:YOUR_PASSWORD@localhost:3306/ai_finance_manager

# Security & JWT Secrets (generate 32+ character random strings)
JWT_ACCESS_SECRET=your_super_secret_jwt_access_key_min_32_chars_long
JWT_REFRESH_SECRET=your_super_secret_jwt_refresh_key_min_32_chars_long
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
OTP_EXPIRES_IN_SECONDS=60

# Optional: Google Gemini AI API Key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash

# Optional: Production SMTP (defaults to in-memory JSON simulator in dev)
SMTP_HOST=
SMTP_PORT=587
SMTP_USER=
SMTP_PASS=
SMTP_FROM=noreply@aifinancemanager.com
```

### 3. Install Dependencies & Prepare Database
```bash
# Install root, backend, and frontend dependencies
npm install
npm --prefix server install
npm --prefix client install

# Generate Prisma Client and deploy migrations
npm run prisma:generate
npm run prisma:migrate
```

### 4. Run Development Servers
```bash
# Terminal 1: Start Backend API (runs on http://localhost:5000)
npm run server:dev

# Terminal 2: Start Frontend Client (runs on http://localhost:5173)
npm run client:dev
```

Open `http://localhost:5173` in your browser. The landing page will run diagnostics and confirm that both the Backend API and MySQL Database are connected.

---

## Environment Variables Reference

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `5000` | Express server HTTP port |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `test`, `production`) |
| `CORS_ORIGIN` | Yes | `http://localhost:5173` | Allowed CORS origin for frontend client requests |
| `DATABASE_URL` | Yes | — | Prisma MySQL connection string (`mysql://user:pass@host:port/db`) |
| `JWT_ACCESS_SECRET` | Yes | — | Secret key used to sign access tokens (&ge; 32 characters) |
| `JWT_REFRESH_SECRET` | Yes | — | Secret key used to sign refresh tokens (&ge; 32 characters) |
| `JWT_ACCESS_EXPIRES_IN` | No | `15m` | Lifetime of access token |
| `JWT_REFRESH_EXPIRES_IN` | No | `7d` | Lifetime of refresh token |
| `OTP_EXPIRES_IN_SECONDS` | No | `60` | OTP validity window (1 minute) |
| `GEMINI_API_KEY` | No | — | Google Gemini API Key for AI Assistant |
| `GEMINI_MODEL` | No | `gemini-2.5-flash` | Gemini model variant |
| `SMTP_HOST` | No | — | Outbound email SMTP host |
| `SMTP_PORT` | No | `587` | SMTP port (`465` for SSL, `587` for TLS) |
| `SMTP_USER` | No | — | SMTP authentication username |
| `SMTP_PASS` | No | — | SMTP authentication password |
| `SMTP_FROM` | No | `noreply@...` | From address on outgoing verification emails |

---

## Automated Testing Suite

The project includes two layers of automated testing: 174 backend integration/audit tests and 11 end-to-end user journeys running against a live headless browser.

### Backend Unit & Integration Tests (174 Tests)

Run the complete backend test suite:
```bash
npm test
```

Or run individual test modules:
```bash
npm run test:auth       # 37 Tests: Registration, OTP, JWT rotation, token reuse invalidation, RBAC
npm run test:financial  # 33 Tests: Account CRUD, Categories, double-entry Transactions, Ledger balances
npm run test:phase4     # 23 Tests: Monthly Budgets, Savings Goals, Cash Flow & MoM Analytics
npm run test:phase5     # 56 Tests: AI Tool execution, Security sandbox, Prompt injection guards
npm run test:phase6     # 25 Tests: Concurrency balance increments, Decimal precision, Overdraft rollback
```

### Playwright End-to-End User Journeys (11 Journeys)

Playwright tests the complete real-world user flow in headless Chromium:

```bash
# Execute full end-to-end test suite
npm run test:e2e
```

**Tested Journeys**:
1. **Landing Page Diagnostics**: Validates system connectivity badges and route guards redirecting unauthenticated users to `/login`.
2. **Negative Authentication**: Verifies bad password rejection and HTML5 input requirements.
3. **User Registration & OTP Verification**: Signs up, fetches the real 6-digit OTP code, verifies on the UI, and enters the dashboard.
4. **User Login & Dashboard Access**: Authenticates with verified credentials and checks net worth metrics.
5. **Account Management**: Creates Bank and Savings accounts and verifies initial balances.
6. **Income & Expense Recording**: Records income and expense transactions, validating real-time balance calculations.
7. **Double-Entry Account Transfer**: Transfers funds between accounts, verifying source debit and destination credit.
8. **Transaction Edit & Safe Deletion**: Edits amounts and deletes transactions with browser confirmation dialogs, verifying balance restoration.
9. **Budget Planning & Limit Tracking**: Sets category budgets and verifies remaining limit progress bars.
10. **Savings Goals & Milestone Tracking**: Creates savings goals with target deadlines and verifies completion percentages.
11. **Dashboard Analytics, AI Assistant & Secure Logout**: Verifies cash flow charts, launches AI Assistant queries, logs out, and confirms protected routes are guarded.

---

## Security & Financial Integrity Architecture

1. **Database-Level Atomic Operations**:
   - Balance changes use Prisma's atomic `{ increment: amount }` and `{ decrement: amount }` operations (`UPDATE accounts SET balance = balance + ? WHERE id = ?`).
   - Row-level database locks eliminate lost updates during concurrent transactions.
2. **Decimal Monetary Precision**:
   - All financial amounts use MySQL `DECIMAL(14, 2)` and Prisma `Decimal` instances.
   - Eliminates IEEE 754 binary floating-point rounding errors (e.g. `0.1 + 0.2 = 0.30000000000000004`).
3. **Double-Entry Ledger Integrity**:
   - Transfers execute inside an atomic `prisma.$transaction`.
   - If either account operation fails, the entire transaction rolls back.
4. **Token Family Reuse Detection**:
   - Refresh tokens are assigned a cryptographically random UUID `family`.
   - If an expired or already-rotated refresh token is replayed, the backend revokes the entire token family immediately.
5. **Rate Limiting**:
   - Strict rate limiting on authentication routes (`15 req/15min` in production).
   - Dedicated rate limiter on AI Assistant endpoints to prevent resource exhaustion.
6. **AI Assistant Sandboxing**:
   - AI has zero direct database or raw SQL execution capabilities.
   - All financial insights route through 7 strictly read-only tools where `userId` is enforced from the verified JWT session.

---

## Production Deployment with Docker

### Running via Docker Compose

The application is containerized with multi-stage Dockerfiles and a root `docker-compose.yml`:

```bash
# 1. Build and launch all services in detached mode
docker compose up --build -d

# 2. Check container health status
docker compose ps

# 3. View live logs
docker compose logs -f server
```

Services started:
- `mysql`: MySQL 8.0 database with persistent volume `mysql_data`.
- `server`: Express backend API with health check probes on port `5000`.
- `client`: React frontend bundle served by Nginx with reverse proxy and gzip on port `80`.

To stop the services:
```bash
docker compose down
```

---

## Database Backup & Recovery Procedures

Backup and restore scripts are provided in `scripts/`:

### Using PowerShell (Windows)
```powershell
# Create a backup
.\scripts\db-backup-restore.ps1 -Action backup -OutputFile ./backups/finance_backup.sql

# Restore a backup (prompts for confirmation)
.\scripts\db-backup-restore.ps1 -Action restore -InputFile ./backups/finance_backup.sql
```

### Using Bash (Linux / macOS / Docker)
```bash
# Create a backup
./scripts/db-backup-restore.sh backup ./backups/finance_backup.sql

# Restore a backup
./scripts/db-backup-restore.sh restore ./backups/finance_backup.sql
```

---

## CI/CD Workflow

The GitHub Actions workflow (`.github/workflows/ci.yml`) triggers on every push and pull request to `main`:
1. **Build & Type Check**: Validates TypeScript compilation for both frontend and backend.
2. **Prisma Validation**: Ensures Prisma schema syntax and model integrity.
3. **Automated Integration Tests**: Spins up a MySQL service container, runs database migrations, and executes all 174 backend tests.
4. **Playwright End-to-End Tests**: Installs Chromium and executes the 11 user journeys.

---

## Verification Matrix & Phase Status

| Phase | Module | Verification Status | Test Coverage |
| :---: | :--- | :---: | :--- |
| **Phase 1** | Foundation & Architecture Setup | **Verified** | Health diagnostics, Schema validation |
| **Phase 2** | Authentication, Security & RBAC | **Verified** | 37 Automated Tests |
| **Phase 3** | Financial Core (Accounts & Transactions) | **Verified** | 33 Automated Tests |
| **Phase 4** | Budgets, Savings Goals & Analytics | **Verified** | 23 Automated Tests |
| **Phase 5** | Secure AI Financial Assistant | **Verified** | 56 Automated Tests |
| **Phase 6** | Audits, Concurrency, Docker & E2E | **Verified** | 25 Audit Tests + 11 Playwright E2E Journeys |
| **Total** | **AI Finance Manager Full Platform** | **100% Passing** | **174 Backend Tests + 11 E2E Journeys** |

---

## License

This project is licensed under the ISC License.
