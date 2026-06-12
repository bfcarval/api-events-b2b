import { Request, Response } from 'express';
import { z } from 'zod';
import { EventService } from '../services/event.service';

const eventService = new EventService();

export const eventSchema = z.object({
    id: z.string().uuid('O ID deve ser um UUID válido.'),
    type: z.enum(['VENDA', 'DEVOLUÇÃO', 'ATUALIZAÇÃO_ESTOQUE']),
    payload: z.record(z.any()),
    origin: z.string().min(1, 'Origem do parceiro é obrigatória.')
});

export class EventController {
    async handle(req: Request, res: Response) {
        try {
            const validatedBody = eventSchema.parse(req.body);
            const result = await eventService.receiveEvent(validatedBody);

            if (result.status === 'duplicado') {
                return res.status(409).json({ message: 'Evento já processado anteriormente.', data: result.event });
            }
            return res.status(202).json(result.event);

        } catch (error: any) {
            if (error instanceof z.ZodError) {
                return res.status(400).json({
                    message: 'Dados de evento inválidos.',
                    errors: error.errors
                });
            }

            return res.status(500).json({ message: 'Erro interno no servidor.' });
        }
    }

    async getStatus(req: Request, res: Response) {
        const event = await eventService.getStatus(req.params.id);
        if (!event) return res.status(404).json({ error: 'Evento não encontrado.' });
        return res.json(event);
    }

    async getStats(req: Request, res: Response) {
        const stats = await eventService.getStats();
        return res.json(stats);
    }

    async retry(req: Request, res: Response) {
        try {
            const result = await eventService.retryDeadLetter(req.params.id);
            return res.json(result);
        } catch (error: any) {
            return res.status(400).json({ error: error.message });
        }
    }
}
