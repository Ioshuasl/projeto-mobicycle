import { Router } from "express";
import { webhooksController } from "../controllers/webhooks_controller.ts";

/** Webhooks Mercado Pago — sem JWT (wiring apenas). */
export function createWebhooksRoutes(): Router {
  const router = Router();

  router.post("/webhooks/mercadopago", webhooksController.mercadoPago);
  router.get("/webhooks/mercadopago", webhooksController.mercadoPago);

  return router;
}
