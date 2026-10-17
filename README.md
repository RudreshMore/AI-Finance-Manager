# AI Finance Manager

An enterprise-grade, full-stack personal finance management application with a secure, backend-orchestrated AI financial assistant.

---

## Architecture Overview

- **Frontend (`client/`)**: React 19, TypeScript, Vite, Tailwind CSS, Axios, React Router, Lucide Icons, Recharts.
- **Backend (`server/`)**: Node.js, Express, TypeScript (strict mode), Prisma ORM, Zod validation, JWT, Bcrypt, Helmet, Express-Rate-Limit, Nodemailer.
- **Database**: MySQL 8.0 with exact `DECIMAL(14, 2)` monetary precision.

---

## Phase 2: Authentication, Security & Authorization Module

Phase 2 introduces production-grade security, identity verification, and role-based access control.

### Security Highlights
1. **Password Security**: Passwords are validated using strict Zod rules (8+ chars, upper, lower, digit, symbol) and hashed with `bcryptjs` (salt rounds 12). Password hashes are never returned in responses.
2. **1-Minute Email OTP Verification**: Cryptographically secure 6-digit OTPs (`crypto.randomInt`), stored as SHA-256 hashes with 1-minute expiration. Previous active codes are invalidated on resend, and brute-force attempts are locked after 5 failures.
3. **JWT Access & Refresh Token Rotation**:
   - Short-lived **15-minute Access Token**.
   - Long-lived **7-day Refresh Token** delivered in an `HttpOnly`, `SameSite: Lax`, `Secure` cookie.
   - **Token Reuse Detection**: If a revoked refresh token is presented, the entire token family is immediately revoked, protecting against token theft (OWASP compliant).
4. **Forgot & Reset Password**: Generic responses to prevent email enumeration. Successful password reset invalidates all existing sessions and refresh tokens across all devices.
5. **Rate Limiting & Headers**: `express-rate-limit` prevents brute-force login and OTP spam; `helmet` enforces HTTP security headers.
6. **Role-Based Access Control (RBAC)**: Support for `USER` and `ADMIN` roles enforced through declarative middleware (`requireAuth`, `requireRole([Role.ADMIN])`).

---

## API Endpoints

| Method | Endpoint | Auth Required | Description |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | None | Service status, uptime, and live MySQL ping latency. |
| `POST` | `/api/auth/register` | None (Rate Limited) | Register a new user (`isVerified: false`), generate & email 1-min OTP. |
| `POST` | `/api/auth/verify-otp` | None (Rate Limited) | Verify 6-digit code for `EMAIL_VERIFICATION` or `PASSWORD_RESET`. |
| `POST` | `/api/auth/resend-otp` | None (Rate Limited) | Invalidate old codes and re-issue a fresh 1-min OTP. |
| `POST` | `/api/auth/login` | None (Rate Limited) | Authenticate credentials; sets `refreshToken` in `HttpOnly` cookie and returns `accessToken`. |
| `POST` | `/api/auth/refresh` | Cookie or Body | Rotates refresh token, detects reuse, and issues a new access token. |
| `POST` | `/api/auth/logout` | Optional | Revokes refresh token in database and clears authentication cookies. |
| `POST` | `/api/auth/forgot-password` | None (Rate Limited) | Sends password reset OTP. Generic non-enumerating response. |
| `POST` | `/api/auth/reset-password` | None (Rate Limited) | Consumes reset OTP, sets new password, and terminates all active sessions. |
| `GET` | `/api/auth/me` | Bearer or Cookie | Returns sanitized profile for currently authenticated user. |
| `GET` | `/api/auth/admin-check` | ADMIN Role | RBAC test endpoint requiring `ADMIN` role (returns 403 for `USER`). |

---

## Environment Variables

### Backend (`server/.env`)
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# MySQL Connection String
DATABASE_URL="mysql://root:YOUR_PASSWORD@localhost:3306/ai_finance_manager"

# JWT Secrets
JWT_ACCESS_SECRET="your_super_secret_jwt_access_key_min_32_characters"
JWT_ACCESS_EXPIRES_IN="15m"
JWT_REFRESH_SECRET="your_super_secret_jwt_refresh_key_min_32_characters"
JWT_REFRESH_EXPIRES_IN="7d"

# OTP Expiry (1 minute = 60s)
OTP_EXPIRES_IN_SECONDS=60

# Optional SMTP Email Configuration (If omitted, fast simulated dev logger is used)
SMTP_HOST=smtp.ethereal.email
SMTP_PORT=587
SMTP_USER=your_smtp_user
SMTP_PASS=your_smtp_password
SMTP_FROM="AI Finance Manager <noreply@aifinancemanager.com>"
```

### Frontend (`client/.env`)
```env
VITE_API_BASE_URL=http://localhost:5000/api
```

---

## Running Automated Tests

Run the complete 37-test authentication & security suite:

```bash
# Inside server/
npm test
```

The test suite covers:
- Registration validation and non-leakage of password hashes
- Duplicate registration handling
- Pre-verification login blocking (403)
- 6-digit OTP verification and 1-minute expiration
- OTP brute-force attempt lockout
- OTP reuse rejection
- Valid and invalid credentials login
- `HttpOnly` cookie delivery
- Bearer token authentication
- Token refresh rotation and token reuse detection
- Multi-device session revocation on password reset
- RBAC validation: USER forbidden (403) vs ADMIN authorized (200)

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
   - `http://localhost:5173/` - System Health & Module Overview
   - `http://localhost:5173/register` - User Registration
   - `http://localhost:5173/verify-otp` - OTP Verification
   - `http://localhost:5173/login` - Secure Login
   - `http://localhost:5173/forgot-password` - Forgot Password
   - `http://localhost:5173/dashboard` - Protected User Dashboard & RBAC Tester
