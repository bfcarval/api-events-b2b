import { prisma } from '../config/database';
import { eventQueue } from '../queues/event.queue';
import { logger } from '../utils/logger';

export class EventService {
    async receiveEvent(data: { id: string; type: string; payload: any; origin: string }) {

        const existingEvent = await prisma.event.findUnique({ where: { id: data.id } });

        if (existingEvent) {
            logger.warn(`Evento duplicado rejeitado: ${data.id}`);
            return { status: 'duplicado', event: existingEvent };
        }

        const event = await prisma.event.create({
            data: {
                id: data.id,
                type: data.type,
                payload: data.payload,
                origin: data.origin,
                status: 'RECEBIDO'
            }
        });

        await eventQueue.add('process-event', { eventId: event.id }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });

        return { status: 'aceito', event };
    }

    async getStatus(id: string) {
        return prisma.event.findUnique({ where: { id } });
    }

    async getStats() {
        const stats = await prisma.event.groupBy({
            by: ['status'],
            _count: { id: true }
        });
        return stats.reduce((acc: any, curr: any) => {
            acc[curr.status] = curr._count.id;
            return acc;
        }, {});
    }

    async retryDeadLetter(id: string) {
        const event = await prisma.event.findUnique({ where: { id } });
        if (!event || event.status !== 'DEAD_LETTER') {
            throw new Error('Evento não está na dead-letter queue ou não existe.');
        }

        await prisma.event.update({
            where: { id },
            data: { status: 'RECEBIDO', attempts: 0, errorMessage: null }
        });

        await eventQueue.add('process-event', { eventId: id }, {
            attempts: 3,
            backoff: { type: 'exponential', delay: 2000 }
        });

        return { message: 'Evento reenviado para processamento com sucesso.' };
    }
}
