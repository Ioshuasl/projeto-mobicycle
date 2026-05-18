import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { notificationService } from "../services/notification_service.ts";

export const notificationsController = {
  list: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const notifications = await notificationService.listForUser(req.user.id);
      res.json(notifications);
    } catch (err) {
      console.error("Error in /api/notifications:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },

  markRead: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { id } = req.params;
      const result = await notificationService.markAsRead(id, req.user);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/notifications/read:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  },
};
