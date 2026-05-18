import { Router, type RequestHandler } from "express";
import { financialController } from "../controllers/financial_controller.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

/** Transações, depósito, saque, vouchers e cashback. */
export function createFinancialRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/transactions", auth, (req, res) =>
    financialController.listTransactions(req as AuthenticatedRequest, res)
  );
  router.get("/vouchers", auth, (req, res) =>
    financialController.listVouchers(req as AuthenticatedRequest, res)
  );
  router.post("/services/use-cashback", auth, (req, res) =>
    financialController.useCashback(req as AuthenticatedRequest, res)
  );
  router.post("/financial/deposit", auth, (req, res) =>
    financialController.deposit(req as AuthenticatedRequest, res)
  );
  router.post("/financial/withdraw", auth, (req, res) =>
    financialController.withdraw(req as AuthenticatedRequest, res)
  );
  router.post("/vouchers/purchase", auth, (req, res) =>
    financialController.purchaseVoucher(req as AuthenticatedRequest, res)
  );
  router.post("/vouchers/send", auth, (req, res) =>
    financialController.sendVoucher(req as AuthenticatedRequest, res)
  );

  return router;
}
