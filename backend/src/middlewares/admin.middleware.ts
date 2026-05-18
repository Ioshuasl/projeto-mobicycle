import type { Response, NextFunction } from 'express';
import type { AuthUser, AuthenticatedRequest } from './auth.middleware.ts';

export function isUserAdmin(user: AuthUser | null | undefined): boolean {
  if (!user) return false;
  return user.email === 'consultorcredenciado@gmail.com';
}

/** Exige `authenticateUser` antes. Alinhado a `isUserAdmin` em `server.ts`. */
export const authorizeAdmin = (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): void => {
  if (!isUserAdmin(req.user)) {
    res.status(403).json({
      error: 'Acesso negado. Apenas administradores podem realizar esta ação.',
    });
    return;
  }
  next();
};
