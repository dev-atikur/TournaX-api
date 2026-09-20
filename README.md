# Play With Fair (PWF) Backend

Native Node.js HTTP API for the Play With Fair Free Fire tournament platform.

## Stack

- Node.js HTTP server (no Express)
- MongoDB + Mongoose
- JWT cookies (`localId`, `accessId`, `resetId`, `otpId`)
- bcrypt, Nodemailer, Twilio Verify, otplib

## Setup

```bash
npm install
cp .env.example .env
npm run dev
```

The server listens on `0.0.0.0` and `process.env.PORT || 5000`.

## Health

`GET /health`

## Auth cookies

| Cookie | Purpose |
| --- | --- |
| `accessId` | Short-lived access JWT |
| `localId` | Refresh / session JWT |
| `otpId` | OTP challenge |
| `resetId` | Password reset session |

CORS origins come from `FRONTEND_URL` (comma-separated). Credentials are enabled. `Access-Control-Allow-Origin: *` is never used.

## Main routes

- `/api/auth` — register, login, logout, refresh, password, 2FA, email verification
- `/api/user` — profile and reports
- `/api/tournaments` — list, details, register, participants, status
- `/api/matches` — matches and official results
- `/api/leaderboard` — global and tournament rankings
- `/api/notifications` — user notifications
- `/api/admin` — users, bans, roles, reports, tournament/match management
