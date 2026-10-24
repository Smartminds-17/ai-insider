# Development Guide

This document outlines key development patterns and best practices for the AI Insider project.

## Feature Flagging Workflow

To ensure new features can be developed and merged safely without affecting the production environment, we use a feature flagging system. This allows us to "deploy" code without "releasing" the feature to users.

Follow these steps whenever you are building a new feature that isn't ready for production.

### 1. Define the Flag

-   **File:** `src/lib/feature-flags.ts`
-   **Action:** Add a new entry to the `featureFlagsSchema` object.
-   **Details:** Use Zod to define the environment variable name (e.g., `FEATURE_NEW_THING`), and ensure you set a `.default('false')`. This is crucial for safety.

**Example:**

```typescript
const featureFlagsSchema = z.object({
  FEATURE_PAYMENTS: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
  FEATURE_MENTORSHIP: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
  // Add your new flag here
  FEATURE_NEW_THING: z.string().transform(val => val === 'true').pipe(z.boolean()).default('false'),
});
```

### 2. Protect the UI

-   **File:** The main page component for your new feature (e.g., `app/new-thing/page.tsx`).
-   **Action:** At the very top of the component function, check the status of your feature flag. If it's disabled, call `notFound()` from `next/navigation`.

**Example:**

```typescript
import { featureFlags } from '@/lib/feature-flags';
import { notFound } from 'next/navigation';

export default function NewThingPage() {
  if (!featureFlags.FEATURE_NEW_THING) {
    notFound();
  }

  // ... rest of your component code
}
```

### 3. Protect the API

-   **File:** Every API route handler related to your feature (e.g., `app/api/new-thing/route.ts`).
-   **Action:** At the top of every request handler (`GET`, `POST`, etc.), check the flag. If it's disabled, return a `404 Not Found` response.

**Example:**

```typescript
import { featureFlags } from '@/src/lib/feature-flags';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  if (!featureFlags.FEATURE_NEW_THING) {
    return NextResponse.json({ error: 'This feature is not enabled.' }, { status: 404 });
  }

  // ... rest of your API logic
}
```

### 4. Enable for Local Development

-   **File:** `.env.local` (create this file in the project root if it doesn't exist).
-   **Action:** To work on the feature, add the environment variable and set it to `true`.

**Example (`.env.local`):**

```
FEATURE_NEW_THING=true
```

### 5. Release the Feature

-   **Action:** When the feature is fully tested and ready for production, the *only* change required is to update the environment variable in your production environment (e.g., your Docker configuration) to `true`. No new code deployment is needed to activate the feature.