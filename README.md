# Secure Auth API

A production-focused, email-verified authentication backend built with **Fastify** and **Prisma Next (Prisma 8)**, shipping with a **React + Vite** frontend ("Shielded").

It implements signup, login, OTP email verification (via [Resend](https://resend.com)), access + refresh token rotation with reuse detection, and session/account management — hardened with Helmet, CORS, and rate limiting.

## Tech Stack

| Layer       | Technology                                             |
| ----------- | ------------------------------------------------------ |
| Runtime     | Node.js, TypeScript (ESM)                              |
| HTTP server | Fastify 5 (+ Helmet, CORS, rate-limit)                 |
| Database    | PostgreSQL via Prisma Next (Prisma 8, contract-first)  |
| Auth        | Argon2 (passwords), jose (JWT access tokens)           |
| Emails      | Resend (OTP delivery)                                  |
| Frontend    | React 18, Vite, React Router, Tailwind CSS             |

## Features

- Email + password signup with Argon2 password hashing
- Email verification via 6-digit OTP (5-minute expiry, 5-attempt limit, burned on verify)
- Login / logout with rotating refresh tokens (reuse detection revokes the session)
- Signed JWT access tokens
- Protected `/auth/me` endpoint
- Account deletion
- Helmet security headers, per-route rate limiting, CORS allow-list
- Fastify logger with sensitive-field redaction

## Project Structure

```
secure-auth-api/
├── src/
│   ├── app.ts                       # Fastify app assembly (plugins, routes, error handler)
│   ├── server.ts                    # Server bootstrap
│   ├── config/env.ts                # Environment variable validation
│   ├── plugins/database.ts          # Decorates Fastify with the Prisma db client
│   ├── prisma/                      # Data contract + generated client wiring
│   │   ├── contract.prisma          # The data contract (source of truth)
│   │   ├── contract.json / .d.ts    # Emitted artifacts
│   │   └── db.ts                    # Postgres ORM client
│   ├── lib/                         # password, otp, tokens, refresh-token, email
│   ├── hooks/authenticate.ts        # JWT auth guard
│   └── routes/                      # health, auth
├── migrations/                      # Prisma Next migration graph (app/)
├── frontend/                        # React + Vite client
└── prisma.config.ts                 # Prisma Next configuration
```

## Prerequisites

- **Node.js** 18 or newer (ESM + TypeScript)
- **PostgreSQL** instance (local or remote)
- A **Resend** account + API key for sending OTP emails

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the backend example and fill in your values:

```bash
cp .env.example .env
```

| Variable             | Required | Description                                              |
| -------------------- | -------- | -------------------------------------------------------- |
| `DATABASE_URL`       | Yes      | PostgreSQL connection string                             |
| `ACCESS_TOKEN_SECRET`| Yes      | Secret used to sign JWT access tokens                    |
| `RESEND_API_KEY`     | Yes      | Resend API key for OTP email delivery                    |
| `OTP_FROM_EMAIL`     | Yes      | Verified sender address used in OTP emails               |
| `PORT`               | No       | Server port (default `3000`)                             |
| `HOST`               | No       | Bind host (default `0.0.0.0`)                            |
| `NODE_ENV`           | No       | `development` / `production`                             |
| `FRONTEND_URL`       | No       | Allowed CORS origin (default `http://localhost:5173`)    |

Example `.env`:

```env
PORT=3000
HOST=0.0.0.0
NODE_ENV=development
DATABASE_URL="postgresql://user:password@localhost:5432/secure_auth"
ACCESS_TOKEN_SECRET="a-long-random-secret"
RESEND_API_KEY="re_xxxxx"
OTP_FROM_EMAIL="noreply@yourdomain.com"
```

> **Security:** Never commit `.env` — it is gitignored. Use strong, unique values for `ACCESS_TOKEN_SECRET` and `RESEND_API_KEY`.

### 3. Configure the frontend

```bash
cd frontend
cp .env.example .env
```

The frontend reads `VITE_API_URL` (default `http://localhost:3000`) to reach the API:

```env
VITE_API_URL=http://localhost:3000
```

(`npm install` again is required inside `frontend/` — it has its own `package.json`.)

### 4. Set up the database

Prisma Next applies the committed migration graph (`migrations/app/`) to your database. With the `DATABASE_URL` set, run:

```bash
npm run contract:emit   # ensure emitted artifacts match the contract
npx prisma db migrate   # applies all pending migrations in graph order
```

This creates the tables and writes the Prisma marker row. You can verify the database matches the contract with:

```bash
npx prisma db verify
```

> Already have an existing/signed database or iterating on the schema quickly? You can bring an empty database up to the current contract directly with `npx prisma db init`, or sync live schema changes during development with `npx prisma db update`. Use the migration path (`db migrate`) for anything shared or that reaches production.

## Running the App

### Backend (development, with hot reload)

```bash
npm run dev
```

The API listens on `http://localhost:3000` (or your `PORT`/`HOST`). Health check: `GET /health`.

### Frontend (development)

```bash
cd frontend
npm run dev
```

The Vite dev server starts at `http://localhost:5173`.

## API Reference

| Method | Endpoint            | Auth     | Description                                  |
| ------ | ------------------- | -------- | -------------------------------------------- |
| POST   | `/auth/signup`      | No       | Start registration (email + password)        |
| POST   | `/auth/login`       | No       | Sign in, returns access + refresh tokens     |
| POST   | `/auth/otp/request` | No       | Request a verification / signup OTP          |
| POST   | `/auth/otp/verify`  | No       | Verify the OTP and confirm the account       |
| POST   | `/auth/refresh`     | No       | Rotate refresh token, get a new access token |
| POST   | `/auth/logout`      | No       | Revoke the session + refresh token           |
| GET    | `/auth/me`          | Bearer   | Fetch the current authenticated user         |
| DELETE | `/auth/account`     | Bearer   | Delete the authenticated account             |
| GET    | `/health`           | No       | Health / DB connectivity check               |

### Example: signup + verify flow

```bash
# 1. Start registration
curl -X POST http://localhost:3000/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","password":"supersecret"}'

# 2. An OTP email is sent (via Resend). Request it if needed:
curl -X POST http://localhost:3000/auth/otp/request \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com"}'

# 3. Verify with the code from the email
curl -X POST http://localhost:3000/auth/otp/verify \
  -H "Content-Type: application/json" \
  -d '{"email":"you@example.com","otp":"123456"}'
```

## Production Build

Build the TypeScript backend and start it:

```bash
npm run build
npm run start
```

Build the frontend for static hosting:

```bash
cd frontend
npm run build   # outputs to frontend/dist
```

## Common Commands

| Task                       | Command                                    |
| -------------------------- | ------------------------------------------ |
| Install deps               | `npm install`                              |
| Run backend (dev)          | `npm run dev`                              |
| Run frontend (dev)         | `cd frontend && npm run dev`               |
| Build backend              | `npm run build`                            |
| Start built backend        | `npm run start`                            |
| Re-emit Prisma contract    | `npm run contract:emit`                    |
| Apply DB migrations        | `npx prisma db migrate`                    |
| Verify DB vs contract      | `npx prisma db verify`                     |
| Inspect migration graph    | `npx prisma migration list`                |

## Troubleshooting

- **`DATABASE_URL is not configured` on startup** — the `.env` file is missing or the variable isn't set. Create it from `.env.example`.
- **`Database not signed` / marker missing** — the DB hasn't been initialised with the contract. Run `npx prisma db migrate` (or `npx prisma db init` on an empty/quick dev DB).
- **OTP emails not sent** — verify `RESEND_API_KEY` and `OTP_FROM_EMAIL`, and that the sender domain is verified in Resend.
- **CORS errors from the frontend** — make sure `FRONTEND_URL` matches the origin your frontend is served from, and that `VITE_API_URL` points at the backend.

## License

This is a personal/experimental project. See the repository for details.
