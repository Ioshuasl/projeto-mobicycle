import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { UserUpdatePayload } from "../interfaces/user.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { userService } from "../services/user_service.ts";

function handleUserError(err: unknown, res: Response, fallbackMessage: string): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  console.error(fallbackMessage, err);
  res.status(500).json({ error: fallbackMessage });
}

export const userController = {
  update: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await userService.update(req.user, req.body as UserUpdatePayload);
      res.json(user);
    } catch (err) {
      handleUserError(err, res, "Erro interno do servidor");
    }
  },

  referrals: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const referrals = await userService.getReferrals(req.user.id);
      res.json(referrals);
    } catch {
      res.status(500).json({ error: "Erro interno ao buscar indicados" });
    }
  },

  network: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const depth = req.query.depth as string | undefined;
      const network = await userService.getNetwork(req.user.id, depth);
      res.json(network);
    } catch {
      res.status(500).json({ error: "Erro ao buscar rede" });
    }
  },
};
