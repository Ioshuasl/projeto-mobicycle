import { Router, type RequestHandler, type Response } from "express";
import { db, generateId, getSetting } from "../config/db.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import {
  activateUserLicenseAfterGatewayPayment,
  LICENSE_CHECKOUT_PREFIX,
} from "../services/license_service.ts";
import {
  createCheckoutProPreferenceWithAppPaths,
  isMercadoPagoConfigured,
} from "../utils/mercadopago/index.ts";

/** Licença: checkout-pro e ativação manual (migrado de `server.ts`). */
export function createLicenseRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.post("/user/activate", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const { userId } = req.body as { userId?: string };
      console.log("[debug:license][/api/user/activate]", {
        authUserId: authUser.id,
        bodyUserId: userId,
      });

      if (!userId || (authUser.id !== userId && !isUserAdmin(authUser))) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) as {
        is_activated: number;
      } | null;

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (user.is_activated) {
        return res.status(400).json({ error: "Licença já está ativa" });
      }

      const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
      await activateUserLicenseAfterGatewayPayment(userId, adhesionFee);

      console.log("[debug:license][/api/user/activate] concluído com sucesso", { userId });
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/user/activate:", err);
      res.status(500).json({ error: "Erro ao ativar licença" });
    }
  });

  router.post("/license/checkout-pro", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({
          error: "Pagamento não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no servidor.",
        });
      }

      const userId = authUser.id;
      const user = (await db
        .prepare(
          "SELECT id, email, name, is_activated as isActivated FROM users WHERE id = ?"
        )
        .get(userId)) as {
        id: string;
        email: string | null;
        name: string | null;
        isActivated: number;
      } | null;

      console.log("[debug:license][/api/license/checkout-pro] início", {
        userId,
        hasUser: !!user,
      });

      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (user.isActivated) {
        return res.status(400).json({ error: "Licença já está ativa" });
      }

      const email = (user.email ?? "").trim();
      if (!email) {
        return res.status(400).json({
          error: "Cadastre um e-mail na conta para pagar com Mercado Pago.",
        });
      }

      const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
      if (!Number.isFinite(adhesionFee) || adhesionFee <= 0) {
        return res.status(500).json({ error: "Valor de adesão inválido nas configurações." });
      }

      const checkoutId = generateId("lc");
      const externalReference = `${LICENSE_CHECKOUT_PREFIX}${checkoutId}`;

      const nameParts = (user.name ?? "").trim().split(/\s+/);
      const firstName = nameParts[0] || "Cliente";
      const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const pref = await createCheckoutProPreferenceWithAppPaths({
        externalReference,
        title: "Licença de Uso MOBICYCLE — Taxa de adesão",
        itemId: "license_adhesion",
        amount: adhesionFee,
        payer: { email, name: firstName, surname },
        statementDescriptor: "MOBICYCLE",
        successPath: "/?licensePayment=success",
        pendingPath: "/?licensePayment=pending",
        failurePath: "/?licensePayment=failure",
      });

      await db
        .prepare(
          `INSERT INTO license_checkouts (
            id, user_id, external_reference, preference_id, amount, currency_id, status
          ) VALUES (?, ?, ?, ?, ?, 'BRL', 'PENDING')`
        )
        .run(checkoutId, userId, externalReference, pref.preferenceId, adhesionFee);

      console.log("[debug:license][/api/license/checkout-pro] preferência criada", {
        userId,
        checkoutId,
        externalReference,
        preferenceId: pref.preferenceId,
        amount: adhesionFee,
      });

      res.json({
        checkoutUrl: pref.checkoutUrl,
        preferenceId: pref.preferenceId,
        externalReference,
        checkoutId,
        amount: adhesionFee,
      });
    } catch (err) {
      console.error("Error in /api/license/checkout-pro:", err);
      const msg = err instanceof Error ? err.message : "Erro ao iniciar checkout";
      if (msg.includes("MERCADOPAGO_ACCESS_TOKEN")) {
        return res.status(503).json({ error: "Pagamento não configurado no servidor." });
      }
      res.status(500).json({ error: msg || "Erro ao iniciar checkout de licença" });
    }
  });

  return router;
}
