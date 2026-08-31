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

## Where to extend next

- **Editable syllabus**: insert a review/edit screen between syllabus
  generation and video sourcing in `src/application/generatePath.ts`.
- **Real accounts**: replace `src/infrastructure/auth/getOrCreateUserId.ts`
  with real auth; the `User` model already exists in the schema.
- **Monetization**: gate `generatePath` calls per month on the free tier —
  the `LearningPath` table already has `createdAt` and `userId` to count
  against.
