import { Request, Response, NextFunction } from 'express';
import logger from './logger.ts';
import { ZodError } from 'zod';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  // Se for erro de validação do Zod
  if (err instanceof ZodError) {
    return res.status(400).json({
      error: 'Erro de Validação',
      details: err.issues.map(e => ({
        path: e.path.join('.'),
        message: e.message
      }))
    });
  }

  // Loga o erro completo no Winston para auditoria
  logger.error(`[ErrorHandler] ${err.message}`, {
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body
  });

  // Resposta genérica para o usuário (segurança: não vaza detalhes técnicos)
  const statusCode = err.status || err.statusCode || 500;
  const message = statusCode === 500 ? 'Erro interno no servidor' : err.message;

  res.status(statusCode).json({
    error: message
  });
};

// Helper para envolver funções assíncronas e capturar erros automaticamente
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
};
