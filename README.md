# AI Finance Manager

An enterprise-grade, full-stack personal finance management application with a secure, backend-orchestrated AI financial assistant.

---

## Architecture Overview

- **Frontend (`client/`)**: React 19, TypeScript, Vite, Tailwind CSS, Axios, React Router, Lucide Icons, Recharts.
- **Backend (`server/`)**: Node.js, Express, TypeScript (strict mode), Prisma ORM, Zod validation, JWT, Bcrypt, Helmet, Express-Rate-Limit, Nodemailer.
- **Database**: MySQL 8.0 with exact `DECIMAL(14, 2)` monetary precision.

---

## Implementation Roadmap & Current Status

- [x] **Phase 1: Foundation & Architecture Setup** (Database schema, Prisma singleton, health check diagnostic)
- [x] **Phase 2: Authentication, Security & Authorization Module** (Registration, 1-min OTP, JWT rotation, password reset, RBAC)
- [x] **Phase 3: Financial Core — Accounts, Categories & Transactions** (Multi-account ledger, default/custom tagging, atomic balance updates, double-entry transfers, overdraft protection)
- [x] **Phase 4: Budgets, Savings Goals & Financial Analytics** (Category budgets, savings milestones, cash flow analytics, Recharts dashboard)
- [ ] **Phase 5: AI Financial Assistant**

---

## Phase 4: Budgets, Savings Goals & Financial Analytics

### 1. Monthly Budget Management
- **Category Scoping**: Budgets are strictly assigned to `EXPENSE` categories.
- **Duplicate Prevention**: Database-level unique constraint `(userId, categoryId, month, year)` prevents duplicate budgets.
- **Dynamic Real-Time Spending**: Actual spending is dynamically computed from user transactions within the month/year period. Refunds, edits, and deletions instantly reflect without stale cached values.
- **Status Thresholds**:
  - `ON_TRACK`: < 80% utilization
  - `APPROACHING`: &ge; 80% and &le; 100% utilization
  - `EXCEEDED`: > 100% utilization (displays overspent amount)

### 2. Savings Goals
- **Milestone Tracking**: Name, target amount, current saved amount, and optional target date.
- **Rate Recommendation**: Calculates required monthly savings based on remaining months until target date.
- **Status Automation**: `ACTIVE`, `COMPLETED` (&ge; 100% of target reached), or `OVERDUE` (target date elapsed).
- **Strict Ledger Isolation**: Updating manual goal progress is completely separated from bank balances—never silently modifies user account balances.

### 3. Financial Analytics Engine
- **Cash Flow Summary**: Total income, total expenses, net cash flow (`income - expenses`), and savings rate percentage. Transfers are strictly excluded.
- **Category Breakdown**: Expense distribution by category with percentage share of total spending.
- **Monthly Trends & Safe MoM**: Tracks income, expenses, and net savings across calendar months. Calculates Month-over-Month (MoM) percentage change safely handling zero or null previous denominators without returning `Infinity` or `NaN`.
- **Currency-Safe Account Summaries**: Aggregates account reserves strictly by currency without cross-currency summing.
- **Budget & Goal Summaries**: Aggregates health counts, total limits, and overall progress metrics.

---

## API Endpoints Reference

### Budgets (`/api/budgets`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/budgets?month=&year=` | List category budgets for selected month/year with spending & status. |
| `POST` | `/api/budgets` | Create monthly category budget for an expense category. |
| `GET` | `/api/budgets/:id` | Get individual budget details and utilization. |
| `PUT` | `/api/budgets/:id` | Update budget amount. |
| `DELETE` | `/api/budgets/:id` | Remove budget configuration. |

### Savings Goals (`/api/goals`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/goals` | List all savings goals with progress and status. |
| `POST` | `/api/goals` | Create a savings goal with target amount and date. |
| `GET` | `/api/goals/:id` | Get individual goal details. |
| `PUT` | `/api/goals/:id` | Update goal details or recorded savings amount. |
| `DELETE` | `/api/goals/:id` | Delete savings goal. |

### Analytics (`/api/analytics`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/analytics/summary` | Cash flow metrics (Income, Expenses, Net Flow, Savings Rate). |
| `GET` | `/api/analytics/category-breakdown` | Expense spending grouped by category with percentages. |
| `GET` | `/api/analytics/monthly-trends` | 6-month income vs expenses trends with safe MoM percentages. |
| `GET` | `/api/analytics/account-balances` | Account reserves breakdown grouped strictly by currency. |
| `GET` | `/api/analytics/budget-summary` | Aggregated monthly budget utilization and health counts. |
| `GET` | `/api/analytics/goals-summary` | Aggregated savings goals progress and target metrics. |

---

## Running Automated Tests

Run the complete 93-test integration suite:

```bash
# Inside root or server/
npm test
```

Or run individual test suites:
```bash
npm run test:auth       # 37 Authentication & Security tests
npm run test:financial  # 33 Accounts, Categories & Transactions tests
npm run test:phase4     # 23 Budgets, Savings Goals & Analytics tests
```

---

## Running the Application Locally

1. **Start the Backend Server**:
   ```bash
   npm run server:dev
   ```
   Backend runs on `http://localhost:5000`

2. **Start the Frontend Client**:
   ```bash
   npm run client:dev
   ```
   Frontend runs on `http://localhost:5173`

3. **Navigate to the Client**:
   - `http://localhost:5173/` - System Health & Diagnostic Overview
   - `http://localhost:5173/login` - Secure Authentication
   - `http://localhost:5173/dashboard` - Real-time Analytics Dashboard & Recharts Visualizations
   - `http://localhost:5173/accounts` - Multi-Account Management
   - `http://localhost:5173/categories` - Expense & Income Category Classifier
   - `http://localhost:5173/transactions` - Filterable Ledger & Double-Entry Transfers
   - `http://localhost:5173/budgets` - Monthly Category Budgets & Spending Guards
   - `http://localhost:5173/goals` - Savings Goals & Monthly Target Recommendations
