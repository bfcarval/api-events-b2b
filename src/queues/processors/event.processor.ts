import { Worker, Job } from 'bullmq';
import { redisConnection } from '../../config/redis';
import { prisma } from '../../config/database';
import { logger } from '../../utils/logger';

const worker = new Worker('event-processor-queue', async (job: Job) => {
    const { eventId } = job.data;

    const event = await prisma.event.update({
        where: { id: eventId },
        data: { status: 'PROCESSANDO', attempts: { increment: 1 } }
    });

    logger.info(`Processando evento: ${eventId} - Tentativa: ${event.attempts}`);

    let currentPayload = event.payload && typeof event.payload === 'object' ? event.payload : {};

    if (event.type === 'VENDA' && !currentPayload.hasOwnProperty('taxProcessed')) {
        currentPayload = {
            ...currentPayload,
            taxProcessed: true,
            enrichedAt: new Date().toISOString()
        };
    }

    if (Math.random() > 0.75) {
        throw new Error('Falha simulada na comunicação com o sistema downstream.');
    }

    await prisma.event.update({
        where: { id: eventId },
        data: {
            status: 'SUCESSO',
            payload: currentPayload as any
        }
    });

    logger.info(`Evento ${eventId} distribuído com sucesso.`);
}, {

    connection: redisConnection as any,
    concurrency: 10
});

worker.on('failed', async (job: Job | undefined, err: Error) => {
    if (!job) return;
    const { eventId } = job.data;

    const currentAttempts = job.attemptsMade;
    const maxAttempts = job.opts.attempts || 3;

    if (currentAttempts >= maxAttempts) {
        logger.error(`Evento ${eventId} excedeu retries. Movendo para DEAD_LETTER.`);
        await prisma.event.update({
            where: { id: eventId },
            data: { status: 'DEAD_LETTER', errorMessage: err.message }
        });
    } else {
        logger.warn(`Tentativa do evento ${eventId} falhou. Tentando novamente... Erro: ${err.message}`);
        await prisma.event.update({
            where: { id: eventId },
            data: { status: 'FALHA', errorMessage: err.message }
        });
    }
});

export default worker;
