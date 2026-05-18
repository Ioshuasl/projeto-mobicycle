import type { Response } from "express";
import { HttpError } from "../interfaces/errors.ts";
import type { AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { licenseService } from "../services/license_service.ts";

function handleLicenseError(err: unknown, res: Response, fallbackMessage: string): void {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message });
    return;
  }
  const msg = err instanceof Error ? err.message : fallbackMessage;
  if (msg.includes("MERCADOPAGO_ACCESS_TOKEN")) {
    res.status(503).json({ error: "Pagamento não configurado no servidor." });
    return;
  }
  res.status(500).json({ error: msg || fallbackMessage });
}

export const licenseController = {
  activate: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const { userId } = req.body as { userId?: string };
      const result = await licenseService.activateManual(req.user, userId);
      res.json(result);
    } catch (err) {
      if (err instanceof HttpError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      console.error("Error in /api/user/activate:", err);
      res.status(500).json({ error: "Erro ao ativar licença" });
    }
  },

  checkoutPro: async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const result = await licenseService.createCheckoutPro(req.user.id);
      res.json(result);
    } catch (err) {
      console.error("Error in /api/license/checkout-pro:", err);
      handleLicenseError(err, res, "Erro ao iniciar checkout de licença");
    }
  },
};
