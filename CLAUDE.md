# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

AI interview practice service — Phase 1 MVP.
- Guest session creation/reuse (cookie-based, 30 days)
- Profile CRUD (education, career, certification, activity)
- Job posting CRUD (link / text / PDF filename)

## Commands

```bash
npm run dev          # start dev server at http://localhost:3000
npm run build        # prisma generate + next build
npm run lint         # eslint
```

No test suite exists yet.

## Environment Setup

Copy `.env.example` to `.env` and fill in:

```
SUPABASE_URL="https://<project-ref>.supabase.co"
SUPABASE_ANON_KEY="<anon-key>"
```

The Supabase project (`elxbazkeqbkuwuzgbwxf`, region: ap-southeast-1) already has all tables created. No migration step needed for a fresh clone — just set the env vars and run `npm run dev`.

## Architecture

**Database**: Supabase PostgreSQL via `@supabase/supabase-js` client. Prisma is present for schema reference and `prisma generate` at build time but is **not used at runtime** — all queries go through `lib/supabase.ts`.

**Data flow**:
- Server components (`app/profile/page.tsx`, `app/job-posting/page.tsx`) query Supabase directly to pass `initialData` props
- Client components (`ProfileForm`, `JobPostingForm`) call API routes on save
- API routes (`app/api/*/route.ts`) use `lib/supabase.ts` for all DB operations

**Session system** (`lib/session.ts`):
- `getOrCreateSession()` — called by `GET /api/session` on first page load; creates a `guest_sessions` row and sets an HTTP-only cookie
- `getSessionFromCookie()` — used by every API route and server component to resolve the current session ID
- `SessionInitializer` client component triggers `GET /api/session` on mount to ensure the cookie exists

**Key relationships**: `guest_sessions → profiles → (educations, careers, certifications, activities)` and `guest_sessions → job_postings`. All child records are **full-replaced** on each profile save (delete all + insert new).

## Scope

**In scope**: guest session, profile CRUD, job posting CRUD, Korean UI, Supabase persistence.

**Out of scope** (do not add): auth/login, OAuth, AI analysis, question generation, interview flow, reports, payment, admin.

## Core Rules

- No auth — all reads/writes are scoped to the current guest session cookie
- Korean for all user-facing copy
- Validate inputs with Zod (`lib/schemas.ts`) before any DB write
- Use `lib/supabase.ts` singleton for all Supabase queries
- Prisma schema (`prisma/schema.prisma`) reflects the DB structure but is not used at runtime; keep it in sync if columns change
- RLS is disabled on all tables — the anon key has full access

## Data Models (Supabase tables)

`guest_sessions`, `profiles`, `educations`, `careers`, `certifications`, `activities`, `job_postings`

All ID columns are `TEXT` (UUID generated with `uuidv4()`). `updatedAt` is set manually on every write (Prisma's `@updatedAt` is not active at runtime).

`job_postings.sourceType`: `LINK | TEXT | PDF` — only one of `sourceUrl`, `rawText`, `fileName` is populated per record.
