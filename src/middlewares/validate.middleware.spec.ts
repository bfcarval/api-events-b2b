import { describe, it, expect, vi } from 'vitest';
import { validateBody } from './validate.middleware';
import { z } from 'zod';

describe('ValidateMiddleware - Validador de Contratos', () => {
    const schemaTeste = z.object({
        nome: z.string(),
        idade: z.number(),
    });

    it('Deve chamar a função next() se o objeto for válido', () => {
        const req = { body: { nome: 'Rafael', idade: 30 } } as any;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        const next = vi.fn();

        const middleware = validateBody(schemaTeste);
        middleware(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });

    it('Deve retornar erro 400 se faltar algum campo do contrato', () => {
        const req = { body: { nome: 'Rafael' } } as any;
        const res = { status: vi.fn().mockReturnThis(), json: vi.fn() } as any;
        const next = vi.fn();

        const middleware = validateBody(schemaTeste);
        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Validação falhou' }));
    });
});
