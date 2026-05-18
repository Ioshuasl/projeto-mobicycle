import type { Request, Response, NextFunction, RequestHandler } from "express";
import { ZodError } from "zod";
import { HttpError } from "../interfaces/errors.ts";
import logger from "../utils/logger.ts";

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: "Erro de Validação",
      details: err.issues.map((e) => ({
        path: e.path.join("."),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const e = err as { message?: string; stack?: string; status?: number; statusCode?: number };
  logger.error(`[ErrorHandler] ${e.message ?? err}`, {
    stack: e.stack,
    url: req.originalUrl,
    method: req.method,
    body: req.body,
  });

  const statusCode = e.status || e.statusCode || 500;
  const message = statusCode === 500 ? "Erro interno no servidor" : e.message;

  res.status(statusCode).json({
    error: message,
  });
};

type AsyncRouteHandler = (
  req: Request,
  res: Response,
  next: NextFunction
) => Promise<void | Response>;

export const catchAsync = (fn: AsyncRouteHandler): RequestHandler => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
