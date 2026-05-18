import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { db } from '../config/db.ts';

export const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
export const JWT_EXPIRY = '24h';

export interface AuthUser {
  id: string;
  role: string;
  email: string;
  status: string;
}

export interface AuthenticatedRequest extends Request {
  user: AuthUser;
}

export function generateToken(userId: string, email: string): string {
  return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

/** S01: JWT Bearer ou fallback `x-user-id` (compatibilidade com cliente legado). */
export const authenticateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const authHeader = req.headers.authorization;
  let userId: string | null = null;

  if (authHeader?.startsWith('Bearer ')) {
    try {
      const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as { userId?: string };
      userId = decoded.userId ?? null;
    } catch {
      res.status(401).json({ error: 'Token inválido ou expirado' });
      return;
    }
  } else {
    userId = req.headers['x-user-id'] as string;
  }

  if (!userId || userId === 'null' || userId === 'undefined') {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  const user = (await db
    .prepare('SELECT id, role, email, status FROM users WHERE id = ?')
    .get(userId)) as AuthUser | null;

  if (!user) {
    res.status(401).json({ error: 'Não autenticado' });
    return;
  }

  (req as AuthenticatedRequest).user = user;
  next();
};
