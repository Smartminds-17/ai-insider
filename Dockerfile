FROM node:22.14.0-alpine AS base
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
RUN apk add --no-cache openssl

FROM base AS dependencies
COPY package.json package-lock.json ./
COPY prisma ./prisma
RUN npm ci

FROM dependencies AS build
COPY . .
# Copy node_modules from dependencies stage
COPY --from=dependencies /app/node_modules ./node_modules
# Generate Prisma client before building Next.js app (critical for Prisma to work)
RUN npx prisma generate
RUN npm run build && \
    # Preserve node_modules including Prisma client when copying standalone files
    mkdir -p ./node_modules && \
    cp -r .next/standalone/* ./ && \
    cp -r public ./public && \
    mkdir -p ./.next && \
    cp -r .next/static ./.next/static && \
    cp -r node_modules/.prisma ./node_modules/.prisma

FROM node:22.14.0-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1
# Add openssl to runner stage (required for Prisma in production)
RUN apk add --no-cache openssl && \
    addgroup --system --gid 1001 nodejs && adduser --system --uid 1001 nextjs
COPY --from=build --chown=nextjs:nodejs /app/package.json ./package.json
COPY --from=build --chown=nextjs:nodejs /app/server.js ./server.js
COPY --from=build --chown=nextjs:nodejs /app/.next ./.next
COPY --from=build --chown=nextjs:nodejs /app/public ./public
# Copy Prisma files for production database access
COPY --from=build --chown=nextjs:nodejs /app/prisma ./prisma
COPY --from=build --chown=nextjs:nodejs /app/node_modules/.prisma ./node_modules/.prisma
# Copy full Prisma client to ensure all dependencies are present
COPY --from=build --chown=nextjs:nodejs /app/node_modules/@prisma ./node_modules/@prisma
USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
CMD ["node", "server.js"]