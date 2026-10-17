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
- [ ] **Phase 4: Budgets, Savings Goals & Financial Analytics**
- [ ] **Phase 5: AI Financial Assistant**

---

## Phase 3: Financial Core Module

### Core Accounting & Integrity Principles
1. **Decimal Precision**: Monetary values strictly stored as MySQL `DECIMAL(14, 2)` and manipulated with Prisma `Decimal` to eliminate binary floating-point rounding errors.
2. **Indian Rupee (INR) Default**: Standard currency defaults to `INR` with currency formatting (`₹`).
3. **Atomic Balance Updates**: Every income, expense, and transfer updates account balances within an isolated `prisma.$transaction`.
4. **Double-Entry Transfers**: Inter-account fund transfers atomically deduct from the source account and credit the destination account, logging full transfer history.
5. **Overdraft Protection**: Expense or transfer operations resulting in negative balances are rejected on regular accounts (`BANK`, `CASH`, `WALLET`, `SAVINGS`), while permitted on `CREDIT_CARD`.
6. **Safe Deletion Locks**:
   - Accounts with existing transactions cannot be deleted to maintain audit integrity.
   - System categories are immutable; custom categories with linked transactions cannot be deleted.
   - Deleting a transaction atomically reverses its financial impact on the account balance.

---

## Financial API Endpoints

### Accounts (`/api/accounts`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/accounts` | List authenticated user's active accounts with balances. |
| `POST` | `/api/accounts` | Create new account (`BANK`, `CASH`, `WALLET`, `CREDIT_CARD`, `SAVINGS`, `OTHER`). |
| `GET` | `/api/accounts/:id` | Get account details. |
| `PUT` | `/api/accounts/:id` | Update account name or type. |
| `DELETE` | `/api/accounts/:id` | Safely delete account (blocked if transactions exist). |
| `GET` | `/api/accounts/:id/transactions` | Fetch account-specific ledger with pagination. |

### Categories (`/api/categories`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/categories` | List system categories and user-created custom categories. |
| `POST` | `/api/categories` | Create custom category (`INCOME` or `EXPENSE`). |
| `PUT` | `/api/categories/:id` | Rename custom category (system categories locked). |
| `DELETE` | `/api/categories/:id` | Delete custom category (blocked if linked to transactions). |

### Transactions (`/api/transactions`)
| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/api/transactions` | Query ledger with filters (accountId, categoryId, type, search, date range, pagination). |
| `POST` | `/api/transactions` | Record `INCOME` or `EXPENSE` and atomically adjust account balance. |
| `POST` | `/api/transactions/transfer` | Execute double-entry transfer between two accounts. |
| `GET` | `/api/transactions/:id` | Get transaction details. |
| `PUT` | `/api/transactions/:id` | Update transaction amount or details with atomic balance adjustment. |
| `DELETE` | `/api/transactions/:id` | Delete transaction with automatic atomic balance reversal. |

---

## Phase 2: Authentication & Security Module

- **Password Security**: Validated using strict Zod rules (8+ chars, upper, lower, digit, symbol) and hashed with `bcryptjs` (salt rounds 12).
- **1-Minute Email OTP Verification**: Cryptographically secure 6-digit OTPs (`crypto.randomInt`), stored as SHA-256 hashes with 1-minute expiration.
- **JWT Access & Refresh Token Rotation**:
  - Short-lived **15-minute Access Token**.
  - Long-lived **7-day Refresh Token** delivered in an `HttpOnly`, `SameSite: Lax`, `Secure` cookie.
  - **Token Reuse Detection**: Immediate invalidation of token family upon reuse.
- **Forgot & Reset Password**: Generic non-enumerating responses, single-use scoped OTP, all active sessions revoked on reset.
- **Role-Based Access Control (RBAC)**: Support for `USER` and `ADMIN` roles enforced via middleware.

---

## Running Automated Tests

Run the complete 70-test integration suite:

```bash
# Inside server/
npm test
```

Or run individual test suites:
```bash
npm run test:auth       # 37 Authentication & Security tests
npm run test:financial  # 33 Accounts, Categories & Transactions tests
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
   - `http://localhost:5173/login` - Secure Login
   - `http://localhost:5173/register` - User Registration & OTP Flow
   - `http://localhost:5173/dashboard` - Financial Dashboard & Profile Overview
   - `http://localhost:5173/accounts` - Multi-Account Management (`BANK`, `CASH`, `WALLET`, `CREDIT_CARD`)
   - `http://localhost:5173/categories` - Income & Expense Tag Classifier
   - `http://localhost:5173/transactions` - Financial Ledger & Double-Entry Transfers
