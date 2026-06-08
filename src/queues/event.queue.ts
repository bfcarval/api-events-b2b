import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const eventQueue = new Queue('event-processor-queue', {
    connection: redisConnection as any
});
