import type { Request, Response } from "express";
import logger from "../utils/logger.ts";
import { webhooksService } from "../services/webhooks_service.ts";

export const webhooksController = {
  mercadoPago: async (req: Request, res: Response): Promise<void> => {
    try {
      const result = await webhooksService.handleMercadoPagoWebhook({
        method: req.method,
        headers: req.headers as unknown as Record<string, unknown>,
        query: req.query as Record<string, unknown>,
        body: req.body,
      });
      res.status(result.status).send(result.body);
    } catch (err) {
      logger.error("[MP webhook] erro ao processar:", err);
      console.log("[debug:license][/api/webhooks/mercadopago] ERRO 500", {
        message: err instanceof Error ? err.message : String(err),
      });
      res.status(500).send("Error");
    }
  },
};
