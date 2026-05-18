import { Router } from "express";
import { adminTransactionsController } from "../../controllers/admin/transactions_controller.ts";

/** Admin — transações, clawback e documentos — wiring apenas. */
export function createAdminTransactionsRoutes(): Router {
  const router = Router();

  router.get("/admin/documents", adminTransactionsController.listDocuments);
  router.post("/admin/transactions/:id/clawback", adminTransactionsController.clawback);
  router.get("/admin/transactions", adminTransactionsController.listTransactions);

  return router;
}
