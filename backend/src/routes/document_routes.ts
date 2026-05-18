import { parseStringPromise } from "xml2js";
import { Router, type RequestHandler, type Response } from "express";
import { db, generateId, getSetting } from "../config/db.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";

const SESE_CNPJ = process.env.SESE_CNPJ || "47.123.456/0001-89";

/** Documentos do usuário (migrado de `server.ts`). */
export function createDocumentRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/documents", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const documents = await db
        .prepare(
          `SELECT id, user_id as userId, filename, type, status,
           rejection_reason as rejectionReason, amount, created_at as createdAt
           FROM documents WHERE user_id = ? ORDER BY created_at DESC`
        )
        .all(user.id);
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.post("/documents/upload", auth, async (req, res: Response) => {
    const { user: authUser } = req as AuthenticatedRequest;
    try {
      const { userId, filename, content, type } = req.body as {
        userId?: string;
        filename?: string;
        content?: string;
        type?: string;
      };

      if (!userId || !content || !type) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      if (authUser.id !== userId && !isUserAdmin(authUser)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const row = (await db
        .prepare("SELECT referrals_count FROM users WHERE id = ?")
        .get(userId)) as { referrals_count: number } | null;

      if (!row) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      let status = "PENDING";
      let rejectionReason: string | null = null;
      let amount: number | null = null;

      if (type === "NFSE") {
        try {
          const result = await parseStringPromise(content);
          const nfseRoot =
            result?.CompNfse?.Nfse?.[0]?.InfNfse?.[0] ||
            result?.Nfse?.InfNfse?.[0] ||
            result?.Nfse?.InfNfse ||
            result?.ConsultarNfseResposta?.ListaNfse?.[0]?.CompNfse?.[0]?.Nfse?.[0]
              ?.InfNfse?.[0] ||
            result?.NFe?.infNFe?.[0] ||
            result?.NFe?.infNFe;

          if (!nfseRoot) {
            return res.status(400).json({ error: "Estrutura XML inválida ou NFS-e não encontrada." });
          }

          const tomadorCnpj =
            nfseRoot?.TomadorServico?.[0]?.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cnpj?.[0] ||
            nfseRoot?.Tomador?.[0]?.CpfCnpj?.[0]?.CNPJ?.[0] ||
            nfseRoot?.dest?.[0]?.CNPJ?.[0] ||
            "";

          const grossAmountStr =
            nfseRoot?.Servico?.[0]?.Valores?.[0]?.ValorServicos?.[0] ||
            nfseRoot?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] ||
            "0";

          amount = parseFloat(String(grossAmountStr).replace(",", "."));
          const cleanSeseCnpj = SESE_CNPJ.replace(/[^\d]/g, "");
          const cleanTomadorCnpj = String(tomadorCnpj).replace(/[^\d]/g, "");

          if (cleanTomadorCnpj !== cleanSeseCnpj) {
            status = "REJECTED";
            rejectionReason = `CNPJ do tomador (${tomadorCnpj || "não encontrado"}) não corresponde ao da Mobicyclo.`;
          } else {
            const cashboardBonus = parseFloat(await getSetting("matrix_cashboard_bonus", "3990"));
            const requiredAmount =
              row.referrals_count >= 1 ? cashboardBonus / 2 : cashboardBonus;
            if (amount < requiredAmount) {
              status = "REJECTED";
              rejectionReason = `Valor bruto (R$ ${amount.toFixed(2)}) insuficiente. Mínimo necessário: R$ ${requiredAmount.toFixed(2)}`;
            } else {
              status = "APPROVED";
            }
          }
        } catch {
          return res.status(400).json({ error: "Erro ao processar arquivo XML." });
        }
      } else if (type === "ADDRESS_PROOF_LUZ" || type === "ADDRESS_PROOF_PHONE") {
        status = "PENDING";
      } else {
        return res.status(400).json({ error: "Tipo de documento inválido." });
      }

      const docId = generateId("doc");
      await db
        .prepare(
          `INSERT INTO documents (id, user_id, filename, content, type, status, rejection_reason, amount)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(docId, userId, filename, content, type, status, rejectionReason, amount);

      if (status === "APPROVED") {
        await db.prepare("UPDATE users SET document_status = 'VALIDATED' WHERE id = ?").run(userId);
      } else if (status === "REJECTED") {
        await db.prepare("UPDATE users SET document_status = 'REJECTED' WHERE id = ?").run(userId);
      }

      res.json({
        id: docId,
        status,
        rejectionReason,
        amount,
        message:
          status === "APPROVED"
            ? "Documento validado com sucesso!"
            : status === "PENDING"
              ? "Documento enviado para análise manual."
              : "Documento rejeitado.",
      });
    } catch (err) {
      console.error("Error in /api/documents/upload:", err);
      res.status(500).json({ error: "Erro ao processar documento" });
    }
  });

  return router;
}
