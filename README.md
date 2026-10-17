# AI Finance Manager

An enterprise-grade, full-stack personal finance management application with a secure, backend-orchestrated AI financial assistant.

---

## Architecture Overview

- **Frontend (`client/`)**: React 19, TypeScript, Vite, Tailwind CSS, Axios, Lucide Icons, Recharts.
- **Backend (`server/`)**: Node.js, Express, TypeScript (strict mode), Prisma ORM, Zod validation.
- **Database**: MySQL 8.0 with exact `DECIMAL(14, 2)` monetary precision.

---

## Phase 1 Setup & Verification Guide

### Prerequisites
- Node.js (v18+ or v22+)
- MySQL Server 8.0 running locally on port 3306

---

### Step 1: Configure Environment Variables

1. In `server/`, inspect `.env.example` and ensure `server/.env` exists.
2. In `server/.env`, configure your MySQL password:
   ```env
   PORT=5000
   NODE_ENV=development
   CORS_ORIGIN=http://localhost:5173
   DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ai_finance_manager"
   ```
   *(Note: `.env` is git-ignored and never committed to source control).*

---

### Step 2: Database Migration

Create and migrate the database schema:

```bash
# Run from the root directory
npm run prisma:migrate -- --name init

# Or run directly inside server/
cd server
npx prisma migrate dev --name init
```

To inspect your database graphically at any time:
```bash
npm run prisma:studio
```

---

### Step 3: Running the Application

Open two terminal windows:

#### Terminal 1 — Backend:
```bash
npm run server:dev
```
Server runs on: `http://localhost:5000`
Health check endpoint: `http://localhost:5000/api/health`

#### Terminal 2 — Frontend:
```bash
npm run client:dev
```
Client runs on: `http://localhost:5173`

---

### Project Structure

```
AI Finance Manager/
├── client/                     # Vite + React + TypeScript + Tailwind
│   ├── src/
│   │   ├── services/           # Axios API services
│   │   ├── App.tsx             # System health & phase 1 dashboard
│   │   └── main.tsx            # Vite entry point
│   ├── .env                    # Frontend environment configuration
│   └── package.json
│
├── server/                     # Express + TypeScript + Prisma
│   ├── prisma/
│   │   └── schema.prisma       # Prisma schema for MySQL
│   ├── src/
│   │   ├── config/             # DB singleton & Zod env validation
│   │   ├── app.ts              # Express application & health endpoint
│   │   └── server.ts           # Server entry point
│   ├── .env                    # Backend secrets & DB URL (git-ignored)
│   └── package.json
│
├── .gitignore                  # Comprehensive security and build ignore rules
├── package.json                # Root convenience scripts
└── README.md
```

