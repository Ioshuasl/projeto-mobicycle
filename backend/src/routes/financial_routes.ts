import md5 from "md5";
import { Router, type RequestHandler, type Response } from "express";
import { db, generateId, withTransaction } from "../config/db.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { FinancialManager } from "../services/financial_manager.ts";
import { NotificationManager } from "../services/notification_manager.ts";
import { sendNotificationEmail } from "../utils/email.ts";

const CASHBACK_BALANCE_COLUMNS: Record<string, string> = {
  Corridas: "cashback_balance",
  Snack: "snack_fast_cashback",
  Energy: "energy_cashback",
  "Bônus Guincho": "guincho_cashback",
};

/** Transações, depósito, saque, vouchers e cashback (migrado de `server.ts`). */
export function createFinancialRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/transactions", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const transactions = (await db
        .prepare(
          "SELECT id, amount, type, description, status, created_at as createdAt FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50"
        )
        .all(user.id)) as Array<{ id: string; type: string }>;

      const uniqueTransactions = Array.from(
        new Map(transactions.map((t) => [t.id, t])).values()
      );
      const adhesion = uniqueTransactions.filter((t) => t.type === "ADHESION");
      console.log("[debug:license][/api/transactions]", {
        userId: user.id,
        total: uniqueTransactions.length,
        adhesionCount: adhesion.length,
        lastTypes: uniqueTransactions.slice(0, 5).map((t) => t.type),
      });
      res.json(uniqueTransactions);
    } catch (err) {
      console.error("Error in /api/transactions:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.get("/vouchers", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const vouchers = await db
        .prepare(
          `SELECT id, code, amount, owner_id as ownerId, recipient_id as recipientId,
           recipient_email as recipientEmail, recipient_phone as recipientPhone,
           status, created_at as createdAt FROM vouchers
           WHERE owner_id = ? OR recipient_id = ? ORDER BY created_at DESC`
        )
        .all(user.id, user.id);
      res.json(vouchers);
    } catch {
      res.status(500).json({ error: "Erro ao buscar vouchers" });
    }
  });

  router.post("/services/use-cashback", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { amount, serviceName } = req.body as { amount?: number; serviceName?: string };
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }
      if (!serviceName) {
        return res.status(400).json({ error: "Nome do serviço é obrigatório" });
      }

      const balanceColumn = CASHBACK_BALANCE_COLUMNS[serviceName] ?? "cashback_balance";

      const row = (await db
        .prepare(`SELECT ${balanceColumn} as balance FROM users WHERE id = ?`)
        .get(user.id)) as { balance: number } | null;

      if (!row || row.balance < amount) {
        return res.status(400).json({ error: `Saldo de cashback ${serviceName} insuficiente` });
      }

      await withTransaction(async () => {
        await db
          .prepare(`UPDATE users SET ${balanceColumn} = ${balanceColumn} - ? WHERE id = ?`)
          .run(amount, user.id);
        await db
          .prepare(
            "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED')"
          )
          .run(generateId("tx"), user.id, -amount, `Uso de Cashback: ${serviceName}`);
        await FinancialManager.payCashbackUsageUnilevelBonus(user.id, amount, serviceName);
      });

      res.json({ success: true, message: `Serviço ${serviceName} pago com sucesso!` });
    } catch (err) {
      console.error("Error in /api/services/use-cashback:", err);
      res.status(500).json({ error: "Erro ao processar uso de cashback" });
    }
  });

  router.post("/financial/deposit", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { amount } = req.body as { amount?: number };
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor de depósito inválido" });
      }

      const updatedUser = await FinancialManager.processDeposit(user.id, amount);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Error in /api/financial/deposit:", err);
      res.status(400).json({
        error: err instanceof Error ? err.message : "Erro ao processar depósito",
      });
    }
  });

  router.post("/financial/withdraw", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { amount, pixKey } = req.body as { amount?: number; pixKey?: string };
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor de saque inválido" });
      }
      if (!pixKey) {
        return res.status(400).json({ error: "Chave PIX é obrigatória" });
      }

      const updatedUser = await FinancialManager.requestWithdrawal(user.id, amount, pixKey);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Error in /api/financial/withdraw:", err);
      res.status(400).json({
        error: err instanceof Error ? err.message : "Erro ao processar saque",
      });
    }
  });

  router.post("/vouchers/purchase", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { amount } = req.body as { amount?: number };
      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor inválido" });
      }

      const row = (await db
        .prepare("SELECT cashback_balance FROM users WHERE id = ?")
        .get(user.id)) as { cashback_balance: number } | null;

      if (!row || row.cashback_balance < amount) {
        return res.status(400).json({ error: "Saldo de cashback insuficiente" });
      }

      const voucherId = generateId("vch");
      const voucherCode = generateId("code").toUpperCase();

      await withTransaction(async () => {
        await db
          .prepare("UPDATE users SET cashback_balance = cashback_balance - ? WHERE id = ?")
          .run(amount, user.id);
        await db
          .prepare(
            "INSERT INTO vouchers (id, code, amount, owner_id, status) VALUES (?, ?, ?, ?, 'AVAILABLE')"
          )
          .run(voucherId, voucherCode, amount, user.id);
        await db
          .prepare(
            "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED')"
          )
          .run(generateId("tx"), user.id, -amount, `Compra de Voucher: ${voucherCode}`);
      });

      res.json({ success: true, voucher: { id: voucherId, code: voucherCode, amount } });
    } catch {
      res.status(500).json({ error: "Erro ao adquirir voucher" });
    }
  });

  router.post("/vouchers/send", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { voucherId, recipientId, recipientEmail, recipientPhone } = req.body as {
        voucherId?: string;
        recipientId?: string;
        recipientEmail?: string;
        recipientPhone?: string;
      };

      if (!voucherId || (!recipientId && !recipientEmail && !recipientPhone)) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const sender = (await db
        .prepare("SELECT name, email, nickname, referral_code FROM users WHERE id = ?")
        .get(user.id)) as {
        name: string;
        email: string | null;
        nickname: string | null;
        referral_code: string | null;
      } | null;

      if (!sender) {
        return res.status(404).json({ error: "Remetente não encontrado" });
      }

      const voucher = (await db
        .prepare(
          "SELECT * FROM vouchers WHERE id = ? AND owner_id = ? AND (status = 'AVAILABLE' OR status = 'SENT')"
        )
        .get(voucherId, user.id)) as { id: string; amount: number } | null;

      if (!voucher) {
        return res.status(400).json({ error: "Voucher não disponível ou não pertence a você" });
      }

      const appUrl = process.env.APP_URL || "https://www.mobicycle.com.br";
      const registrationLink = `${appUrl}/?ref=${md5(sender.email || "")}/${sender.nickname || ""}`;
      const ruleMessage =
        "Regra: Somente cadastrados diretos podem usar este voucher em corridas no app de mobilidade.";

      if (recipientId) {
        const recipient = (await db
          .prepare("SELECT id, name FROM users WHERE id = ? AND referrer_id = ?")
          .get(recipientId, user.id)) as { id: string; name: string } | null;

        if (!recipient) {
          return res.status(400).json({
            error:
              "O destinatário deve ser um indicado direto na sua rede para poder usar o voucher.",
          });
        }

        await withTransaction(async () => {
          await db
            .prepare(
              "UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?"
            )
            .run(recipientId, recipientId, voucherId);
          const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
          await NotificationManager.createNotification(recipientId, "VOUCHER_RECEIVED", message);
        });
      } else if (recipientEmail) {
        const existingUser = (await db
          .prepare("SELECT id, referrer_id FROM users WHERE email = ?")
          .get(recipientEmail)) as { id: string; referrer_id: string | null } | null;

        if (existingUser) {
          if (existingUser.referrer_id !== user.id) {
            return res.status(400).json({
              error: "Este usuário já está cadastrado sob outro indicador.",
            });
          }

          await withTransaction(async () => {
            await db
              .prepare(
                "UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?"
              )
              .run(existingUser.id, existingUser.id, voucherId);
            const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
            await NotificationManager.createNotification(
              existingUser.id,
              "VOUCHER_RECEIVED",
              message
            );
          });
        } else {
          await db
            .prepare("UPDATE vouchers SET status = 'SENT', recipient_email = ? WHERE id = ?")
            .run(recipientEmail, voucherId);

          const emailSubject = `🎁 Você recebeu um presente de ${sender.name}!`;
          const emailBody = `Olá!\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${ruleMessage}\n\nApós o cadastro, seu voucher estará disponível na sua conta.\n\nEquipe Mobicyclo`;
          await sendNotificationEmail(recipientEmail, emailSubject, emailBody);
        }
      } else if (recipientPhone) {
        const existingUser = (await db
          .prepare("SELECT id, referrer_id FROM users WHERE phone = ?")
          .get(recipientPhone)) as { id: string; referrer_id: string | null } | null;

        if (existingUser) {
          if (existingUser.referrer_id !== user.id) {
            return res.status(400).json({
              error: "Este usuário já está cadastrado sob outro indicador.",
            });
          }

          await withTransaction(async () => {
            await db
              .prepare(
                "UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?"
              )
              .run(existingUser.id, existingUser.id, voucherId);
            const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
            await NotificationManager.createNotification(
              existingUser.id,
              "VOUCHER_RECEIVED",
              message
            );
          });
        } else {
          await db
            .prepare("UPDATE vouchers SET status = 'SENT', recipient_phone = ? WHERE id = ?")
            .run(recipientPhone, voucherId);
        }

        const waMessage = `Olá! 🎁\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${ruleMessage}\n\nApós o cadastro, seu voucher estará disponível na sua conta.`;
        const waUrl = `https://wa.me/${recipientPhone!.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`;
        return res.json({ success: true, whatsappUrl: waUrl });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/vouchers/send:", err);
      res.status(500).json({ error: "Erro ao enviar voucher" });
    }
  });

  return router;
}
