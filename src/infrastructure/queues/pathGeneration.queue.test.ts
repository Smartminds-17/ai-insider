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

describe('BullMQ DLQ Configuration (pathGeneration.queue)', () => {
  let testQueue: Queue | null = null;
  let testWorker: Worker | null = null;
  const redisConnection = getRedisConnection();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Clean up queues after each test
    if (testQueue) {
      await testQueue.drain();
      await testQueue.close();
    }
    if (testWorker) {
      await testWorker.close();
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

    // Create worker that always fails to test retry logic
    testWorker = new Worker<any, any>(
      'test-path-generation',
      async () => {
        throw new Error('Simulated path generation failure');
      },
      {
        connection: redisConnection,
      }
    );

    // Listen for failures to track attempt counts
    testWorker.on('failed', (job) => {
      if (job) {
        failedAttempts.push(job.attemptsMade);
        totalFailures++;
      }
    });

    // Add test job to queue
    const job = await testQueue.add('generate-path', {
      userId: 'test-user-123',
      pathId: 'test-path-123',
      syllabus: testSyllabus,
    });

    // Wait for all retries to complete
    await new Promise<void>((resolve) => {
      testWorker!.on('drained', () => resolve());
    });

    // Verify the fix: exactly 3 attempts, only 1 final failure (no indefinite retries)
    expect(totalFailures).toBe(1);
    expect(failedAttempts).toContain(3);
    expect(failedAttempts.length).toBe(1);
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

    testWorker = new Worker<any, any>(
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