import type { Request, Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { usersService } from "../services/users_service.ts";

export const usersController = {
  getById: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const user = await usersService.getById(req.user, req.params.id);
      res.json(user);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/users/:id:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  getAvatar: async (req: Request, res: Response): Promise<void> => {
    try {
      const payload = await usersService.resolveAvatar(req.params.id);
      if (!payload) {
        res.status(404).send("Not found");
        return;
      }

      if (payload.kind === "buffer") {
        res.setHeader("Content-Type", payload.contentType);
        res.setHeader("Cache-Control", "public, max-age=3600");
        res.send(payload.buffer);
        return;
      }

      res.redirect(payload.url);
    } catch (err) {
      console.error("Error in /api/users/:id/avatar:", err);
      res.status(500).send("Error");
    }
  },
};
