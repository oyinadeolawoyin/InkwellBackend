# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Inkwell** is a writing productivity backend for a social writing app. Writers track word sprints, set writing plans, and join group sprint sessions. The deployed frontend connects from `inkwellinky.vercel.app`.

## Commands

```bash
# Development
npm run dev        # nodemon app.js (auto-reload)
npm start          # node app.js (production)

# Database
npm run build      # prisma generate && prisma db push
npx prisma studio  # GUI for inspecting the database
npx prisma migrate dev --name <name>  # create a migration
```

There are no tests in this project.

## Required Environment Variables

```
DATABASE_URL        # Supabase PostgreSQL connection (pooled)
DIRECT_URL          # Supabase PostgreSQL direct connection (for migrations)
JWT_SECRET          # Secret for signing JWTs
SUPABASE_URL        # Supabase project URL
SUPABASE_KEY        # Supabase anon/service key
PUBLIC_KEY          # VAPID public key (web push)
PRIVATE_KEY         # VAPID private key (web push)
RESEND_API_KEY      # Resend email service key
FRONTEND_URL        # Frontend origin for password reset links
NODE_ENV            # "production" enables secure cookies and strict CORS
```

## Architecture

### Request Flow

```
app.js → routes → controllers → services → prisma (DB) or utilities
```

- **Routes** (`src/routes/`): Define endpoints and apply `authenticateJWT` middleware. Input validation using `express-validator` runs at the route level (see `authRoutes.js` for the pattern).
- **Controllers** (`src/controllers/`): Handle HTTP request/response, call services, no DB access directly.
- **Services** (`src/services/`): All database logic lives here via Prisma. Services are plain async functions, not classes.
- **Config** (`src/config/`): Singletons — `prismaClient.js`, `jwt.js`, `mailer.js`, `multer.js`, `supabaseClient.js`.
- **Utils** (`src/utilis/`): Stateless helpers — `fileUploader.js` (Supabase Storage), `getTimezones.js`, `startOfWeek.js`.

### Authentication

JWT is stored as an `httpOnly` cookie named `token` (21-day expiry). `authenticateJWT` middleware in `src/config/jwt.js` decodes it and attaches `req.user` with `{ id, username, email, role }`. Cookie is `sameSite: none, secure: true` in production for cross-origin Vercel ↔ Render setup.

### Key Domain Concepts

**Sprints**: A timed writing session. `isActive: true` while running, `isPause` for paused state. On `endSprint`, `wordsWritten` is recorded and `checkOffToday()` upserts a `WeeklyProgress` record.

**GroupSprints**: A sprint session that other users can join by creating their own `Sprint` records linked via `groupSprintId`. Solo sprints have `groupSprintId: null`.

**WritingPlan**: Per-day word goals (`mondayGoal`, etc.) and preferred times (`mondayTime` in `HH:mm`). A `null` goal/time means the user skipped that day.

**"Planned day" logic**: Uses **Time fields** (not Goal fields) to determine if a day was planned — a day is planned if `dayTime !== null && !== "" && !== "00:00"`.

**WeeklyProgress**: One record per user per week (`userId_weekStart` unique). Stores boolean checkmarks per day, set when a sprint is completed.

### Cron Job

`jobs/writingPlanReminder.job.js` runs every 5 minutes. It:
1. Fetches all `WritingPlan` records with their users
2. Converts current time to each user's timezone
3. Sends a reminder if: the scheduled time has passed, no reminder was sent today (checked via `SentReminder` unique constraint)
4. Sends notification via `notifyUser()` (in-app DB record + web push + email)

### Notification System (`src/services/notificationService.js`)

`notifyUser(user, message, link)` performs three actions atomically:
1. Saves to `Notification` table
2. Sends web push to all `Subscription` records for the user (VAPID via `web-push`)
3. Sends email via Resend

### File Upload Flow

Files go through Multer (temp disk storage) → `uploadFile()` reads temp file → uploads to Supabase Storage bucket `inkwell` under `uploads/` prefix → returns public URL → temp file deleted. Deletion uses `extractStoragePath()` to parse the Supabase public URL back to the storage path.

### Slow Query Monitoring

`prismaClient.js` logs any query exceeding 350ms to the console with table name, SQL, params, and duration.

### User Roles

`FOUNDING_WRITER` (premium forever) is automatically assigned to the first 10 users at signup. Other roles: `USER`, `ADMIN`, `SPONSOR`.

## API Routes Summary

| Prefix | File |
|---|---|
| `/api/auth` | signup, login, logout, /me, forgetPassword, resetPassword |
| `/api/sprint` | CRUD for sprints and group sprints, likes, public workspace feeds |
| `/api/writingPlan` | User's writing schedule (per-day goals + times) |
| `/api/progress` | Weekly progress checkmarks, daily/weekly stats |
| `/api/projects` | Writing projects (title, description, Google Docs link) |
| `/api/users` | User profile fetch and update |
| `/api/quote` | Quotes with like toggle |
| `/api/notifications` | In-app notifications, push subscription, mark-read |
