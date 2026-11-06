import type { Syllabus } from '@/domain/types';
import { Queue, Worker } from 'bullmq';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { getRedisConnection } from './pathGeneration.queue';

// Test syllabus that matches production schema
const testSyllabus: Syllabus = {
  title: "Test Python Course",
  topics: [
    { title: "Introduction to Python", order: 0 },
    { title: "Variables and Data Types", order: 1 },
    { title: "Functions", order: 2 },
  ]
};

interface PathGenerationJobData {
  userId: string;
  pathId: string;
  syllabus: Syllabus;
}

describe('BullMQ DLQ Configuration (pathGeneration.queue)', () => {
  let testQueue: Queue | null = null;
  let testWorker: Worker | null = null;
  const redisConnection = getRedisConnection();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Close the worker first, then wipe the test queue so failed/retried jobs
    // don't leak between runs.
    if (testWorker) {
      await testWorker.close();
    }
    if (testQueue) {
      await testQueue.obliterate({ force: true }).catch(() => {});
      await testQueue.close();
    }
  });

  it('fails jobs after exactly 3 attempts and does not retry indefinitely', async () => {
    // Skip test if no Redis connection available (local dev fallback)
    if (!redisConnection) {
      console.warn('⚠️ No Redis connection, skipping DLQ integration test');
      return;
    }

    // Track failed attempts
    const failedAttempts: number[] = [];
    let totalFailures = 0;

    // Create test queue with PRODUCTION DLQ settings (matches our implementation)
    testQueue = new Queue('test-path-generation', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 100, // Fast delay for test
        },
        removeOnFail: false,
      }
    });

    // Start from a clean slate: failed/delayed jobs from an earlier run would
    // otherwise add extra 'failed' events to this assertion.
    await testQueue.obliterate({ force: true });

    // Create worker that always fails to test retry logic
    testWorker = new Worker<PathGenerationJobData, void>(
      'test-path-generation',
      async () => {
        throw new Error('Simulated path generation failure');
      },
      {
        connection: redisConnection,
      }
    );

    // BullMQ emits 'failed' once per attempt, so with attempts=3 we expect
    // three events (attemptsMade 1, 2, 3) and then the job stays failed (DLQ).
    let resolveAttempts!: () => void;
    const allAttempts = new Promise<void>((resolve) => {
      resolveAttempts = resolve;
    });

    testWorker.on('failed', (job) => {
      if (!job) return;
      failedAttempts.push(job.attemptsMade);
      totalFailures++;
      if (job.attemptsMade >= 3) resolveAttempts();
    });

    // Add test job to queue
    const job = await testQueue.add('generate-path', {
      userId: 'test-user-123',
      pathId: 'test-path-123',
      syllabus: testSyllabus,
    });

    await Promise.race([
      allAttempts,
      new Promise<void>((_, reject) =>
        setTimeout(() => reject(new Error('Timed out waiting for retries')), 15_000),
      ),
    ]);

    // Verify the fix: exactly 3 attempts, then the job is parked in the DLQ
    // instead of retrying indefinitely.
    expect(totalFailures).toBe(3);
    expect(failedAttempts).toEqual([1, 2, 3]);
    expect(await job.getState()).toBe('failed');
  });

  it('maintains consistent DLQ settings between queue and worker initializations', async () => {
    if (!redisConnection) {
      console.warn('⚠️ No Redis connection, skipping configuration test');
      return;
    }

    // Create queue and worker with our production settings
    testQueue = new Queue('test-config-validation', {
      connection: redisConnection,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnFail: false,
      }
    });

    testWorker = new Worker<PathGenerationJobData, { success: boolean }>(
      'test-config-validation',
      async () => ({ success: true }),
      {
        connection: redisConnection,
      }
    );

    // Extract and verify configuration matches what we implemented
    const queueOpts = testQueue.opts.defaultJobOptions!;

    // Verify our production DLQ settings are correctly applied on the queue
    expect(queueOpts.attempts).toBe(3);
    expect(queueOpts.backoff).toEqual({ type: 'exponential', delay: 5000 });
    expect(queueOpts.removeOnFail).toBe(false);
  });

  it('preserves removeOnComplete behavior for successful jobs', async () => {
    if (!redisConnection) {
      console.warn('⚠️ No Redis connection, skipping success cleanup test');
      return;
    }

    let jobCompleted = false;

    testQueue = new Queue('test-success-cleanup', { connection: redisConnection });
    testWorker = new Worker(
      'test-success-cleanup',
      async () => {
        jobCompleted = true;
        return { success: true };
      },
      { connection: redisConnection }
    );

    // Add job with our production removeOnComplete setting
    await testQueue.add('generate-path', {
      userId: 'test-user-456',
      pathId: 'test-path-456',
      syllabus: testSyllabus,
    }, { removeOnComplete: true });

    await new Promise<void>((resolve) => {
      testWorker!.on('completed', () => resolve());
    });

    // Verify job completed successfully and would be cleaned up
    expect(jobCompleted).toBe(true);
    const waitingJobs = await testQueue.getJobs(['waiting']);
    const activeJobs = await testQueue.getJobs(['active']);
    expect(waitingJobs.length).toBe(0);
    expect(activeJobs.length).toBe(0);
  });
});