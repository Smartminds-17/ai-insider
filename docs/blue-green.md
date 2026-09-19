# Blue/green deployment

This repository includes a Docker-based blue/green setup for a single Linux host. It runs two application containers against the same managed PostgreSQL database and Redis instance. Nginx sends traffic only to the selected colour.

## Required production setup

1. Create a managed PostgreSQL database, a native Redis endpoint for BullMQ, and a container registry.
2. On the host, create a private `.env.production` from `.env.example` using production-only credentials. Set `NEXTAUTH_URL` to the public HTTPS URL and use a different database from staging.
3. Create an untracked `.env.bluegreen`:

   ```dotenv
   AI_INSIDER_BLUE_IMAGE=registry.example.com/ai-insider:stable
   AI_INSIDER_GREEN_IMAGE=registry.example.com/ai-insider:stable
   ACTIVE_COLOR=blue
   ```

4. Build and push immutable image tags, for example `registry.example.com/ai-insider:git-<sha>`. Never promote `latest`.
5. Apply Prisma migrations once, before either colour receives traffic. Migrations must be backward-compatible with the currently live application. The current progress migration is safe in that direction.

## First launch

```bash
docker compose --env-file .env.bluegreen -f docker-compose.blue-green.yml up -d
```

TLS is deliberately not configured in the compose file: terminate TLS at your managed load balancer or add a separately managed certificate configuration. Do not expose this HTTP-only example directly to the public internet.

## Deploy and rollback

Deploy the inactive colour with a new immutable image tag, wait for its health check, then change only `ACTIVE_COLOR` in `.env.bluegreen` and recreate Nginx:

```bash
docker compose --env-file .env.bluegreen -f docker-compose.blue-green.yml pull green
docker compose --env-file .env.bluegreen -f docker-compose.blue-green.yml up -d green
docker compose --env-file .env.bluegreen -f docker-compose.blue-green.yml ps green

# After verifying /api/health and a real signed-in learning flow:
# set ACTIVE_COLOR=green in .env.bluegreen
docker compose --env-file .env.bluegreen -f docker-compose.blue-green.yml up -d nginx
```

Rollback is the same operation in reverse: set `ACTIVE_COLOR` to the previously healthy colour and recreate Nginx. Keep the old colour running until the new release has been observed in production.

## CI/CD boundary

CI validates source code and Docker builds. A production CD job still needs host, registry, SSH/OIDC, DNS, and secret-store choices; those credentials are intentionally not guessed or committed. Before wiring CD, create distinct GitHub environments for `staging` and `production`, require approval for production, and scope each environment's secrets separately.
