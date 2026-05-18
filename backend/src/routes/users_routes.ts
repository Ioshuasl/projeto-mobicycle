import { Router, type RequestHandler, type Response } from "express";
import { db } from "../config/db.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";

const USER_PUBLIC_SELECT = `SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate,
  IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar,
  referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance,
  cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance,
  total_earnings as totalEarnings, document_status as documentStatus, stars, status,
  career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId,
  reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?`;

/** Perfil público: GET /api/users/:id, GET /api/users/:id/avatar */
export function createUsersRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/users/:id", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const { id } = req.params;

      if (authUser.id !== id && !isUserAdmin(authUser)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const user = await db.prepare(USER_PUBLIC_SELECT).get(id);
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (err) {
      console.error("Error in /api/users/:id:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.get("/users/:id/avatar", async (req, res: Response) => {
    try {
      const { id } = req.params;
      const user = (await db
        .prepare("SELECT avatar FROM users WHERE id = ?")
        .get(id)) as { avatar: string | null } | null;

      if (!user?.avatar) {
        return res.status(404).send("Not found");
      }

      const match = user.avatar.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const type = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, "base64");
        res.setHeader("Content-Type", `image/${type}`);
        res.setHeader("Cache-Control", "public, max-age=3600");
        return res.send(buffer);
      }

      return res.redirect(user.avatar);
    } catch (err) {
      console.error("Error in /api/users/:id/avatar:", err);
      res.status(500).send("Error");
    }
  });

  return router;
}
