import { processJob } from '@mediaos/shared/jobs/job-processor';
import { Queue, type JobsOptions } from 'bullmq';

import { run } from './db';
import { getRedisConnection } from './redis';

const useInlineQueue =
  process.env['NODE_ENV'] === 'test' ||
  process.env['USE_INLINE_QUEUE'] === 'true';

let queue: Queue | null = null;

function getQueue(): Queue {
  if (!queue) {
    queue = new Queue('jobs', { connection: getRedisConnection() });
  }
  return queue;
}

export type JobPayload = Record<string, unknown>;

export async function enqueueJob(
  name: string,
  payload: JobPayload,
  options: { attempts?: number } = {}
): Promise<void> {
  if (useInlineQueue) {
    await processJob(name, { ...payload }, run);
    return;
  }

  const addOptions: JobsOptions = {
    removeOnComplete: true,
    removeOnFail: false,
    attempts: options.attempts ?? 3,
  };
  const maybeJobId = payload['jobId'] ? String(payload['jobId']) : undefined;
  if (maybeJobId !== undefined) {
    (addOptions as any).jobId = maybeJobId;
  }
  await getQueue().add(name, payload, addOptions);
}

export async function closeJobQueue(): Promise<void> {
  if (queue) {
    await queue.close();
    queue = null;
  }
}
