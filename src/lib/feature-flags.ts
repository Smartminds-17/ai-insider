
import { z } from 'zod';

const featureFlagsSchema = z.object({
  FEATURE_PAYMENTS: z.string().default('false').transform(val => val === 'true').pipe(z.boolean()),
  FEATURE_MENTORSHIP: z.string().default('false').transform(val => val === 'true').pipe(z.boolean()),
});

const result = featureFlagsSchema.safeParse(process.env);

if (!result.success) {
  console.error('Error parsing feature flags:', result.error.flatten().fieldErrors);
  throw new Error('Invalid feature flag environment variables');
}

export const featureFlags = result.data;