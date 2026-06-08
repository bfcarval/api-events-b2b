import { Request, Response, NextFunction } from 'express';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
    logger.error('Erro não tratado na aplicação:', { message: err.message, stack: err.stack });
    res.status(500).json({ error: 'Erro interno do servidor.' });
};
