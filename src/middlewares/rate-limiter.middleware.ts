import rateLimit from 'express-rate-limit';
import { RedisStore } from 'rate-limit-redis';
import { redisConnection } from '../config/redis';

export const rateLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    store: new RedisStore({
        // @ts-ignore
        sendCommand: (...args: string[]) => redisConnection.call(args[0], ...args.slice(1)),
    }),
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' }
});
