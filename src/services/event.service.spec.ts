import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventService } from './event.service';
import { prisma } from '../config/database';
import { eventQueue } from '../queues/event.queue';

vi.mock('../config/database', () => ({
    prisma: {
        event: {
            findUnique: vi.fn(),
            create: vi.fn(),
            groupBy: vi.fn(),
            update: vi.fn(),
        },
    },
}));

vi.mock('../queues/event.queue', () => ({
    eventQueue: {
        add: vi.fn(),
    },
}));

describe('EventService - Regras de Negócio', () => {
    let eventService: EventService;

    const mockInput = {
        id: 'a8b8c8d8-e8f8-4a4b-a4b4-c4d4e4f4a4b4',
        type: 'VENDA',
        origin: 'PARCEIRO_TESTE',
        payload: { total: 250.0 },
    };

    beforeEach(() => {
        eventService = new EventService();
        vi.clearAllMocks();
    });

    it('Deve aceitar um evento válido, salvar como RECEBIDO e mandar para a fila', async () => {
        vi.mocked(prisma.event.findUnique).mockResolvedValue(null);
        vi.mocked(prisma.event.create).mockResolvedValue({ ...mockInput, status: 'RECEBIDO' } as any);

        const result = await eventService.receiveEvent(mockInput);

        expect(result.status).toBe('aceito');
        expect(prisma.event.create).toHaveBeenCalled();
        expect(eventQueue.add).toHaveBeenCalledWith('process-event', { eventId: mockInput.id }, expect.any(Object));
    });

    it('Deve rejeitar o processamento se o ID já existir (Idempotência)', async () => {
        vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: mockInput.id } as any);

        const result = await eventService.receiveEvent(mockInput);

        expect(result.status).toBe('duplicado');
        expect(prisma.event.create).not.toHaveBeenCalled();
        expect(eventQueue.add).not.toHaveBeenCalled();
    });

    it('Deve agrupar e retornar as estatísticas formatadas corretamente', async () => {
        vi.mocked(prisma.event.groupBy).mockResolvedValue([
            { status: 'SUCESSO', _count: { id: 10 } },
            { status: 'DEAD_LETTER', _count: { id: 2 } },
        ] as any);

        const stats = await eventService.getStats();

        expect(stats).toEqual({ SUCESSO: 10, DEAD_LETTER: 2 });
    });

    it('Deve mover o evento de DEAD_LETTER de volta para a fila ativa', async () => {
        vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: mockInput.id, status: 'DEAD_LETTER' } as any);
        vi.mocked(prisma.event.update).mockResolvedValue({ id: mockInput.id, status: 'RECEBIDO' } as any);

        const result = await eventService.retryDeadLetter(mockInput.id);

        expect(result.message).toContain('com sucesso');
        expect(prisma.event.update).toHaveBeenCalledWith({
            where: { id: mockInput.id },
            data: { status: 'RECEBIDO', attempts: 0, errorMessage: null },
        });
        expect(eventQueue.add).toHaveBeenCalled();
    });

    it('Deve falhar ao tentar dar retry em um evento que não está na DEAD_LETTER', async () => {
        vi.mocked(prisma.event.findUnique).mockResolvedValue({ id: mockInput.id, status: 'SUCESSO' } as any);

        await expect(eventService.retryDeadLetter(mockInput.id)).rejects.toThrow();
    });
});
