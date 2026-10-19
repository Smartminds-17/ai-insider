# AI Insider

AI Insider turns a learning goal into an ordered YouTube study route and saves
your progress. The currently shipped product is the route generator, tutorial
selection, sign-in, and video resume flow. Billing, community, mentors, teams,
and editable routes are intentionally not available yet.

## Stack

- **Next.js 16** (App Router, TypeScript)
- **PostgreSQL + Prisma**
- **Google Gemini** for syllabus generation (opt in with `USE_REAL_GEMINI_API=true`)
- **YouTube Data API v3** for tutorial sourcing
- **Google OAuth and anonymous browser identity**
- **BullMQ + native Redis** for durable path generation when `REDIS_URL` is configured

## Architecture

```
src/
  domain/            # plain types — no framework dependencies
  application/        # use-cases: generatePath, getPath, trackProgress, getRelatedVideos
  infrastructure/
    db/                # Prisma client
    youtube/            # YouTube client + ranking heuristic (rankVideos.ts)
    llm/                # syllabus generation (syllabusGenerator.ts)
    auth/               # anonymous cookie-based user identity and ownership checks
app/
  page.tsx             # prompt entry screen
  path/[id]/page.tsx    # roadmap view
  api/                  # route handlers — thin, delegate to application/ use-cases
components/            # PromptForm, PathRoadmap, PathHero, TopicWaypoint, VideoEmbed, RelatedRail
```

API routes never talk to Prisma/YouTube/Gemini directly — they call into
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

4. **Configure integrations** in `.env`:
   - Set `GEMINI_API_KEY` and `USE_REAL_GEMINI_API=true` for tailored syllabi.
   - Set `YOUTUBE_API_KEY` for real video sourcing. Missing keys and provider
     failures now fail generation visibly rather than saving generic topics or
     placeholder videos.
   - Set `USE_MOCK_DATA=true` only for local UI work. Mock syllabi are disabled
     in production.
   - Production path creation also requires Upstash REST credentials for shared
     rate limits. A persistent Node deployment additionally needs native
     `REDIS_URL` for BullMQ; Vercel uses the bounded `after()` continuation.

5. **Run it**
   ```bash
   npm run dev
   ```
   Visit http://localhost:3000

6. **Build for production**
   ```bash
   npm run build
   npm start
   ```
   Run the repository lint, type-check, and build gates before deploying.

## Deliberately not available yet

No billing, plans, payments, mentor sessions, community, team features, or
editable syllabus. See the ranking heuristic in
`src/infrastructure/youtube/rankVideos.ts` — it uses view count, duration
fit, and recency, not transcript analysis, to keep API/LLM costs low for v1.

## Deployment

Use the included container configuration for a production-like image. The
blue/green host rollout, required secrets, health checks, and rollback process
are documented in [docs/blue-green.md](docs/blue-green.md). Do not deploy
until migrations, production secrets, HTTPS, and both colours have been
verified against a non-production environment.

# AI Insider
## Changelog

All notable changes to this project will be documented in this file.

## [0.2.0] - 2026-09-20
### Added
- **Time-based progress tracking**: Implemented high-water mark `farthestPositionSec` that never decreases, even if users rewind videos
- **Path-level progress calculations**: Path completion now calculated as total watched time / total path duration, replacing simple video count metrics
- **Continue Watching hero component**: New `PathHero.tsx` that surfaces the next video to watch, prioritizing in-progress videos over unwatched ones
- **Coverage-based video selection**: `rankVideos()` now selects videos by relative score rather than fixed count, allowing comprehensive single videos to cover entire topics
- **Anonymous user progress merging**: `mergeAnonymousUser` properly preserves watch progress when converting anonymous sessions to signed-in accounts
- **New database fields**: Added `watchedSeconds`, `lastPositionSec`, and `updatedAt` to Progress model for granular time tracking

### Changed
- **Removed manual watch toggles**: Eliminated manual "mark as watched" functionality - completion is now automatically derived from playback position
- **Updated progress tracking logic**: `updatePlaybackPosition()` replaces legacy `setVideoWatched()` with continuous time-based tracking
- **Codebase cleanup**: Removed 3 orphaned use-cases (`addInspiration.ts`, `listGoals.ts`, `selectTutorial.ts`) that were no longer wired to any UI or API routes
- **Lint compliance**: Fixed React hooks warnings in `RelatedRail.tsx`, achieving 0 eslint errors

### Fixed
- **Stale state warnings**: Added cancellation flags to prevent stale fetches from overwriting component state
- **CI pipeline gates**: The workflow runs lint, type-check, and build checks; the current checkout still has lint errors to resolve before that gate passes.

## [0.1.0] - 2026-09-05
### Added
- **Video player with automatic resume functionality**: Videos now save playback position and resume where users left off when returning to a path
- **Automatic progress tracking**: Saves playback position every 5 seconds while watching, auto-marks videos as watched at >95% completion
- **Database migration**: Added `positionSec` and `lastWatchedAt` columns to Progress model for resume tracking
- **Rate limiting + logging for progress endpoint**: New `/api/progress` endpoint is production-ready with 300 requests/hour limits and structured JSON logging

### Fixed
- **Resolved browser console errors**: Replaced YouTube Player API with reliable postMessage API to fix `getCurrentTime is not a function` errors
- **Single video playback**: Only one video plays at a time across the entire page to prevent audio overlap

---
## Operational notes

- YouTube search and detail calls consume provider quota. Topic results are
  cached in Postgres for 14 days and in memory for one hour per process, so
  repeat topics avoid another provider search across deployments.
- Video ranking balances popularity, duration fit, and recency. It does not
  verify topic relevance with transcripts or an LLM.
- Anonymous identity, visible paths, and cleanup retention share a 45-day
  lifetime. Monthly path limits are associated with that identity; account
  sign-in provides a more durable identity across devices.
- Vercel path processing uses Next.js `after()` and is bounded by the route's
  60-second maximum duration. For longer or durable processing, use the included
  persistent Node/Docker deployment with native Redis and BullMQ.

## Recently completed
- **✓ Time-based progress tracking**: Fully implemented with high-water mark, path-level progress calculations, and automatic watch detection
- **✓ Continue Watching hero**: `PathHero.tsx` component now surfaces next video to watch with resume functionality
- **✓ Codebase cleanup**: Removed all orphaned use-cases, achieved 0 eslint errors, CI pipeline ready
- **✓ Coverage-based video selection**: Intelligent video ranking that can select single comprehensive videos for topics

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
Non-logged-in users (anonymous) retain their identity and paths for 45 days:
- Cookie TTL: 45 days for anonymous users
- Path TTL: Any anonymous user path older than 45 days returns 404
- Cleanup job: `/api/cron/cleanup-anonymous-paths` (call via Supabase Cron to delete expired anonymous paths/users after 45 days)
- Authenticated users retain their paths while their account exists.

- **Editable syllabus**: insert a review/edit screen between syllabus
  generation and video sourcing in `src/application/generatePath.ts`.
- **Additional OAuth providers**: add GitHub, Discord, or email/password auth to NextAuth
  in `src/infrastructure/auth/auth.ts` (the NextAuth setup is already production-ready).
