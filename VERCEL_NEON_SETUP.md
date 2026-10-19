# Vercel + Neon Deployment Guide

## Step 1: Create Neon Database
1. Go to [neon.tech](https://neon.tech) and create an account
2. Create a new project
3. Copy your Neon connection string (it will look like: `postgresql://user:password@ep-xxx-yyy.us-east-2.aws.neon.tech/neondb`)

## Step 2: Configure Environment Variables for Vercel
In your Vercel project dashboard, add these environment variables:

### Required Database Variables
- `DATABASE_URL`: Your full Neon connection string
- `DIRECT_URL`: (Optional but recommended for Prisma Migrate) Your Neon connection string with `?pgbouncer=true` removed

### Authentication & API Keys
- `NEXTAUTH_URL`: Your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
- `NEXTAUTH_SECRET`: Generate with `openssl rand -base64 32`
- `GOOGLE_CLIENT_ID`: From Google Cloud Console
- `GOOGLE_CLIENT_SECRET`: From Google Cloud Console

### AI & Video APIs
- `GEMINI_API_KEY`: From Google AI Studio
- `USE_REAL_GEMINI_API`: "true"
- `YOUTUBE_API_KEY`: From Google Cloud Console (with YouTube Data API v3 enabled)

### Rate Limiting & Internal Security
- `UPSTASH_REDIS_REST_URL`: From Upstash (for rate limiting)
- `UPSTASH_REDIS_REST_TOKEN`: From Upstash
- `INTERNAL_API_SECRET`: Generate with `openssl rand -hex 32`

## Step 3: Prisma Configuration for Neon
Your current `prisma/schema.prisma` is already compatible with Neon (it uses PostgreSQL). Before deploying:

1. Run migrations locally against your Neon database first:
```bash
# Set your DATABASE_URL to Neon in .env
npx prisma migrate deploy
```

2. Generate Prisma client (this happens automatically during build):
```bash
npx prisma generate
```

## Step 4: Vercel Deployment Settings
- Framework preset: Next.js
- Build command: `npm run build` (already configured in package.json)
- Install command: `npm install`
- Node.js version: 22.x (matches your package.json)

## Step 5: Google OAuth Redirect URI
Add your Vercel domain to Google Cloud Console as an authorized redirect URI:
```
https://your-app.vercel.app/api/auth/callback/google
```

## Step 6: Neon Connection Pooling
Neon automatically handles connection pooling. Your existing Prisma setup in `src/infrastructure/db/prisma.ts` is optimized to prevent connection leaks in serverless environments.

## Step 7: Test Before Deployment
```bash
# Test database connection to Neon
node check-database.js

# Local build test
npm run build
```

## Important Notes
- Neon is serverless Postgres that works perfectly with Vercel's serverless functions
- Your Prisma client is cached globally to prevent too many connections
- All environment variables must be set in Vercel before deployment
- Run migrations once before deploying (or use Vercel's build step to run them)