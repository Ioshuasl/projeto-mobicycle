import type { Request, Response } from "express";
import { HttpError } from "../../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../../middlewares/auth.middleware.ts";
import { adminUsersService } from "../../services/admin/users_service.ts";

export const adminUsersController = {
  list: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await adminUsersService.listUsers({
        page: req.query.page as string | undefined,
        limit: req.query.limit as string | undefined,
        search: req.query.search as string | undefined,
      });
      res.json(result);
    } catch (err) {
      console.error("Error in /api/admin/users:", err);
      res.status(500).json({ error: "Erro interno ao buscar usuários" });
    }
  },

  updateStatus: async (req: Request, res: Response): Promise<void> => {
    try {
      const { status } = req.body as { status?: string };
      await adminUsersService.updateStatus(req.params.id, status);
      res.json({ success: true });
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  },

  updateField: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    const { field, value } = req.body as { field?: string; value?: unknown };
    await adminUsersService.updateField(req.user, req.params.id, field, value);
    res.json({ success: true });
  },

  deleteUser: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    await adminUsersService.deleteUser(req.user, req.params.id);
    res.json({ success: true });
  },

  stats: async (_req: Request, res: Response): Promise<void> => {
    try {
      const stats = await adminUsersService.getStats();
      res.json(stats);
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  },

  network: async (req: Request, res: Response): Promise<void> => {
    try {
      const network = await adminUsersService.getUserNetwork(
        req.params.userId,
        req.query.depth as string | undefined
      );
      res.json(network);
    } catch (err) {
      console.error("Error in /api/admin/user/network:", err);
      res.status(500).json({ error: "Erro ao buscar rede do usuário" });
    }
  },
};

/** Mapeia HttpError para resposta (usado com catchAsync). */
export function handleAdminUsersHttpError(err: unknown, res: Response): boolean {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return true;
  }
  return false;
}
