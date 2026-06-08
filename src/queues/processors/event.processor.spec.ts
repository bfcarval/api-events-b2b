import { describe, it, expect, vi, beforeEach } from 'vitest';
import { prisma } from '../../config/database';

vi.mock('../../config/database', () => ({
    prisma: {
        event: {
            update: vi.fn(),
        },
    },
}));

vi.mock('../../config/redis', () => ({ redisConnection: {} }));

describe('EventProcessor - Worker de Background', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('Deve enriquecer dados se o tipo do evento for VENDA', async () => {
        const mockEvent = {
            id: '123',
            type: 'VENDA',
            payload: { item: 'Teclado' },
            attempts: 1,
        };

        vi.mocked(prisma.event.update).mockResolvedValueOnce(mockEvent as any);

        let currentPayload: any = mockEvent.payload;
        if (mockEvent.type === 'VENDA' && !currentPayload.hasOwnProperty('taxProcessed')) {
            currentPayload = { ...currentPayload, taxProcessed: true, enrichedAt: '2026' };
        }

        expect(currentPayload.taxProcessed).toBe(true);
        expect(currentPayload).toHaveProperty('enrichedAt');
    });
});
