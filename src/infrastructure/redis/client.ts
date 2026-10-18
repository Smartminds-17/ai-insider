import Redis from 'ioredis';

/** Create an optional native Redis connection without unhandled or endless retries. */
export function createRedisClient(purpose: string): Redis | null {
  const url = process.env.REDIS_URL?.trim();
  if (!url) return null;

  const client = new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    retryStrategy: (attempt) => attempt <= 3 ? attempt * 250 : null,
  });

  let warningLogged = false;
  client.on('error', (error) => {
    if (warningLogged) return;
    warningLogged = true;
    console.warn(`[redis:${purpose}] Connection unavailable; check REDIS_URL.`, error.message);
  });
  client.on('ready', () => {
    warningLogged = false;
  });

  return client;
}
