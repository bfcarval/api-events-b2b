import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis';

export const eventQueue = new Queue('event-processor-queue', {
    // CORREÇÃO: Força o BullMQ a aceitar a nossa conexão usando o 'as any'
    connection: redisConnection as any
});
