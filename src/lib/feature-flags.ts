
import { z } from 'zod';

// Check if we're running on the server or client
const isServer = typeof window === 'undefined';

// Create schema that works for both server and client environments
// Server: can access both server-only and NEXT_PUBLIC_ vars
// Client: can ONLY access NEXT_PUBLIC_ vars, so server-only vars are defaulted
const featureFlagsSchema = z.object({
  // Server-side only vars (only available on the server)
  FEATURE_PAYMENTS: isServer 
    ? z.string().default('false').transform(val => val === 'true').pipe(z.boolean())
    : z.literal(false).default(false),
  FEATURE_MENTORSHIP: isServer 
    ? z.string().default('false').transform(val => val === 'true').pipe(z.boolean())
    : z.literal(false).default(false),
  // Client-accessible vars (available everywhere)
  NEXT_PUBLIC_FEATURE_PAYMENTS: z.string().default('false').transform(val => val === 'true').pipe(z.boolean()),
  NEXT_PUBLIC_FEATURE_MENTORSHIP: z.string().default('false').transform(val => val === 'true').pipe(z.boolean()),
});

const result = featureFlagsSchema.safeParse(process.env);

if (!result.success) {
  console.error('Error parsing feature flags:', result.error.flatten().fieldErrors);
  throw new Error('Invalid feature flag environment variables');
}

  const parsedFlags = featureFlagsSchema.parse(process.env);
  
  // Always expose all flags in the unified featureFlags object to maintain backward compatibility
  // but ensure that on the client, server-only flags are derived from their client-safe counterparts
  export const featureFlags = {
    FEATURE_PAYMENTS: isServer 
      ? (parsedFlags.NEXT_PUBLIC_FEATURE_PAYMENTS || parsedFlags.FEATURE_PAYMENTS)
      : parsedFlags.NEXT_PUBLIC_FEATURE_PAYMENTS,
    FEATURE_MENTORSHIP: isServer 
      ? (parsedFlags.NEXT_PUBLIC_FEATURE_MENTORSHIP || parsedFlags.FEATURE_MENTORSHIP)
      : parsedFlags.NEXT_PUBLIC_FEATURE_MENTORSHIP,
    NEXT_PUBLIC_FEATURE_PAYMENTS: parsedFlags.NEXT_PUBLIC_FEATURE_PAYMENTS,
    NEXT_PUBLIC_FEATURE_MENTORSHIP: parsedFlags.NEXT_PUBLIC_FEATURE_MENTORSHIP,
  };