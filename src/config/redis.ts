import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
export const redisConnection = new Redis(redisUrl, { maxRetriesPerRequest: null });

redisConnection.on('error', (err) => logger.error('Erro no Redis:', err));
