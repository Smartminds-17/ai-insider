# AI Insider

Tell it what you want to learn. It turns that into an ordered syllabus, finds
the best YouTube video(s) for each step, and tracks your progress through it.

## Stack

- **Next.js 15** (App Router, TypeScript) — frontend + API routes in one app
- **PostgreSQL + Prisma** — see `prisma/schema.prisma`
- **Claude (Anthropic API)** — syllabus generation from a free-text prompt
- **YouTube Data API v3** — video search per topic
- Anonymous per-browser identity via cookie (no accounts in v1)

## Architecture

```
src/
  domain/            # plain types — no framework dependencies
  application/        # use-cases: generatePath, getPath, trackProgress, getRelatedVideos
  infrastructure/
    db/                # Prisma client
    youtube/            # YouTube client + ranking heuristic (rankVideos.ts)
    llm/                # syllabus generation (syllabusGenerator.ts)
    auth/               # anonymous cookie-based user identity
app/
  page.tsx             # prompt entry screen
  path/[id]/page.tsx    # roadmap view
  api/                  # route handlers — thin, delegate to application/ use-cases
components/            # PromptForm, PathRoadmap, TopicWaypoint, VideoEmbed, RelatedRail
```

API routes never talk to Prisma/YouTube/Anthropic directly — they call into
`src/application/`, which orchestrates the infrastructure layer. This means
swapping the LLM provider, the ranking algorithm, or the DB later only
touches one file each.

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Set up Postgres.** Any Postgres instance works (local, Supabase, Railway,
   Neon, etc.). Copy `.env.example` to `.env` and fill in `DATABASE_URL`.

3. **Run the migration**
   ```bash
   npx prisma migrate dev --name init
   ```

4. **Add API keys (optional but recommended)** in `.env`:
   - `ANTHROPIC_API_KEY` — without it, syllabus generation falls back to a
     generic 5-topic outline so you can still test the rest of the app.
   - `YOUTUBE_API_KEY` — without it, video search falls back to mock results
     so you can still test the UI/progress flow without burning API quota.

5. **Run it**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

## What's deliberately not in v1

Per the scoping we did before building: no editable syllabus (AI-locked
ordering), no practice/pause checkpoints, no transcript-based difficulty
classification, no real accounts, no payments. See the ranking heuristic in
`src/infrastructure/youtube/rankVideos.ts` — it uses view count, duration
fit, and recency, not transcript analysis, to keep API/LLM costs low for v1.

## Production fixes & recent improvements (2024)

We've implemented critical fixes to resolve concurrency, rate-limit, and performance issues that were causing mock data fallback, 404s, and slow auth:

### 1. YouTube API Concurrency & Rate Limiting (Fixed)
- **Problem**: Multiple concurrent YouTube API requests were hitting free-tier limits, causing constant `Rate limiter timeout (4000ms)` errors and mock data fallback.
- **Solution**: Replaced complex token-bucket logic with a **sequential rate limiter** (`src/infrastructure/youtube/youtubeClient.ts`) that strictly enforces **1 request every 16 minutes** (matches YouTube free tier's strict quota of ~100 requests/day).
- **Important Free Tier Note**: YouTube's free tier allows ~100 searches/day total. For a syllabus with 5 topics, this means total processing time is ~80 minutes. If you're developing locally, use mock data by omitting `YOUTUBE_API_KEY` from `.env` to avoid real API calls.
- **Details**:
  - 25-minute timeout (up from 4s) to eliminate false timeouts
  - In-memory queue processes only one request at a time
  - Console logs display exact wait time: `YouTube quota: waiting 14 minutes for next search...`
  - Never sends concurrent requests - completely eliminates 429 rate limit errors
  - Updated topic processing to be sequential in `generatePath.ts` to avoid queue pileups

### 2. Auth Callback Speed Fix (3.7s → <200ms)
- **Problem**: Anonymous user migration was running synchronously in the auth callback, causing 5.8s response times.
- **Solution**: Moved migration logic to a fire-and-forget async call (`src/infrastructure/auth/auth.ts`) so auth callbacks respond immediately.

### 3. Path Generation 404 Errors (Fixed)
- **Problem**: Queue was returning fake `local-${Date.now()}` job IDs instead of real path IDs, causing 404s when accessing `/api/paths/[id]`.
- **Solution**: Rewrote `queuePathGeneration()` to return actual database path IDs (`src/infrastructure/queues/pathGeneration.queue.ts`).
- **Bonus**: Removed 50+ lines of unused dead code (in-memory queue variables that were never used).

### 4. Gemini API Rate Limiter Fix
- **Problem**: Original config had 19 requests/day limit, causing 76-minute waits between requests.
- **Solution**: Updated Gemini rate limiter to 15 requests/minute (`src/infrastructure/llm/syllabusGenerator.ts`) to align with Anthropic's free tier limits.

## Where to extend next

## 📝 Hidden UI Elements (Reminders for future implementation)
- **Pricing teaser on landing page**: Commented out in `app/page.tsx` (lines ~35-175) — uncomment the entire section to restore the tier preview cards and "Full plans" link
- **Design-only feature slots**: All future feature markup is already in the codebase but hidden/unused, ready to wire up later:
  - Billing/payment gate: `data-gate-slot` in `components/PromptForm.tsx`
  - Usage meter chip in `components/Header.tsx` (tracks free-tier route limits)
  - CommunityRail and MentorRail sections in `components/PathRoadmap.tsx`
  - Full `/pricing` page is still accessible directly but not linked from the main landing page
- To enable monetization/community features later: only backend logic needs to be added, no UI/markup changes required

## 🚀 Anonymous user path cleanup
Non-logged-in users (anonymous) have their paths automatically expired after 1 hour:
- Cookie TTL: 1 hour for anonymous users (deleted on refresh or after 60 minutes)
- Path TTL: Any anonymous user path older than 1 hour returns 404
- Daily cleanup job: `/api/cron/cleanup-anonymous-paths` (call via Supabase Cron to permanently delete old anonymous paths/users older than 24h)
- Authenticated/registered users keep their paths forever (30-day persistent cookie)

- **Editable syllabus**: insert a review/edit screen between syllabus
  generation and video sourcing in `src/application/generatePath.ts`.
- **Monetization**: gate `generatePath` calls per month on the free tier —
  the `LearningPath` table already has `createdAt` and `userId` to count
  against.
- **Additional OAuth providers**: add GitHub, Discord, or email/password auth to NextAuth
  in `src/infrastructure/auth/auth.ts` (the NextAuth setup is already production-ready).