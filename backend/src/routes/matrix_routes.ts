import { Router, type RequestHandler, type Response } from "express";
import { db, getSetting } from "../config/db.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { authenticateUser, type AuthenticatedRequest } from "../middlewares/auth.middleware.ts";
import { FinancialManager } from "../services/financial_manager.ts";
import { MatrixManager } from "../services/matrix_manager.ts";

type MatrixPositionRow = {
  matrix_id: string;
  position: number;
  userId: string;
  name: string;
  nickname: string;
  referralsCount: number;
  status: string;
  careerLevel: string;
  balance: number;
  cycleSalesCount: number;
  avatar?: string;
};

/** Matrizes: list, join, reentry, history, user/matrix/:targetId (migrado de `server.ts`). */
export function createMatrixRoutes(): Router {
  const router = Router();
  const auth = authenticateUser as RequestHandler;

  router.get("/matrices/history", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const history = await db
        .prepare("SELECT * FROM matrix_cycles WHERE user_id = ? ORDER BY created_at DESC")
        .all(user.id);
      const uniqueHistory = Array.from(new Map(history.map((h) => [(h as { id: string }).id, h])).values());
      res.json(uniqueHistory);
    } catch {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  router.get("/matrices", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const admin = isUserAdmin(user);
      const type = req.query.type as string | undefined;

      let matricesWithPositions: Array<Record<string, unknown>> = [];
      const page = parseInt(String(req.query.page ?? "1"), 10) || 1;
      const limit = parseInt(String(req.query.limit ?? "10"), 10) || 10;
      const offset = (page - 1) * limit;

      if (admin) {
        let query = "SELECT * FROM matrices WHERE status = 'OPEN'";
        const params: unknown[] = [];
        if (type) {
          query += " AND type = ?";
          params.push(type);
        }
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);

        const matrices = (await db.prepare(query).all(...params)) as Array<{ id: string }>;

        if (matrices.length > 0) {
          const matrixIds = matrices.map((m) => m.id);
          const placeholders = matrixIds.map(() => "?").join(",");
          const allPositions = (await db
            .prepare(
              `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
               u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
               u.balance as balance, u.cycle_sales_count as cycleSalesCount
               FROM matrix_positions mp
               JOIN users u ON mp.user_id = u.id
               WHERE mp.matrix_id IN (${placeholders})`
            )
            .all(...matrixIds)) as MatrixPositionRow[];

          const positionsByMatrix = allPositions.reduce<
            Record<string, Array<MatrixPositionRow & { userName: string; userNickname: string }>>
          >((acc, p) => {
            if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
            acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
            return acc;
          }, {});

          matricesWithPositions = matrices.map((m) => ({
            ...m,
            positions: positionsByMatrix[m.id] || [],
          }));
        }
      } else {
        let query = `
          SELECT DISTINCT m.*
          FROM matrices m
          JOIN matrix_positions mp ON m.id = mp.matrix_id
          WHERE m.status = 'OPEN' AND mp.user_id = ?
        `;
        const params: unknown[] = [user.id];
        if (type) {
          query += " AND m.type = ?";
          params.push(type);
        }

        const matrices = (await db.prepare(query).all(...params)) as Array<{ id: string }>;

        if (matrices.length > 0) {
          const allPositions = (await db
            .prepare(
              `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
               u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
               u.balance as balance, u.cycle_sales_count as cycleSalesCount
               FROM matrix_positions mp
               JOIN users u ON mp.user_id = u.id
               WHERE mp.matrix_id IN (
                 SELECT matrix_id FROM matrix_positions WHERE user_id = ?
               )`
            )
            .all(user.id)) as MatrixPositionRow[];

          const positionsByMatrix = allPositions.reduce<
            Record<string, Array<MatrixPositionRow & { userName: string; userNickname: string }>>
          >((acc, p) => {
            if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
            acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
            return acc;
          }, {});

          matricesWithPositions = matrices.map((m) => ({
            ...m,
            positions: positionsByMatrix[m.id] || [],
          }));
        }
      }

      res.json(matricesWithPositions);
    } catch (err) {
      console.error("Error in /api/matrices:", err);
      res.status(500).json({ error: "Erro ao buscar matrizes" });
    }
  });

  router.post("/matrices/join", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { userId, referrerId } = req.body as { userId?: string; referrerId?: string };

      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" });
      }

      if (user.id !== userId && !isUserAdmin(user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const activePosition = await db
        .prepare(
          `SELECT mp.matrix_id FROM matrix_positions mp
           JOIN matrices m ON mp.matrix_id = m.id
           WHERE mp.user_id = ? AND m.status = 'OPEN'`
        )
        .get(userId);

      if (activePosition) {
        return res.status(400).json({
          error:
            "Você já possui uma posição ativa no sistema (On-Board ou Cash-Board). Aguarde o ciclo para reentrar.",
        });
      }

      const formationRule = await getSetting("matrix_formation_rule", "FILL_BASE");
      let matrix: { id: string } | null = null;

      if (formationRule === "FOLLOW_REFERRER" && referrerId) {
        matrix = (await db
          .prepare(
            `SELECT m.id
             FROM matrices m
             JOIN matrix_positions mp ON m.id = mp.matrix_id
             WHERE mp.user_id = ? AND m.type = 'ONBORD' AND m.status = 'OPEN'
             LIMIT 1`
          )
          .get(referrerId)) as { id: string } | null;
      }

      if (!matrix) {
        const openMatrices = (await db
          .prepare(
            "SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC"
          )
          .all()) as Array<{ id: string }>;
        matrix = openMatrices.length > 0 ? openMatrices[0] : null;
      }

      if (!matrix) {
        matrix = await MatrixManager.createMatrix("ONBORD");
      }

      const existing = await db
        .prepare("SELECT * FROM matrix_positions WHERE matrix_id = ? AND user_id = ?")
        .get(matrix.id, userId);

      if (existing) {
        return res.status(400).json({ error: "Usuário já está nesta matriz" });
      }

      if (referrerId && referrerId !== userId) {
        await FinancialManager.addReferralBonus(referrerId, userId);
        const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
        await FinancialManager.payInfiniteBonus(userId, adhesionFee);
        await FinancialManager.payLicenseUnilevelBonus(userId);
      }

      const result = await MatrixManager.fillPosition(matrix.id, userId);
      if (result.error) {
        return res.status(400).json(result);
      }

      await FinancialManager.incrementNetworkSales(userId);
      await db
        .prepare("UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'")
        .run(userId);

      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/matrices/join:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.post("/matrices/reentry", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { userId } = req.body as { userId?: string };

      if (!userId) {
        return res.status(400).json({ error: "userId é obrigatório" });
      }

      if (user.id !== userId && !isUserAdmin(user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const result = await MatrixManager.processReentryInternal(userId);
      if (result.error) {
        return res.status(400).json(result);
      }
      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/matrices/reentry:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  router.get("/user/matrix/:targetId", auth, async (req, res: Response) => {
    const { user } = req as AuthenticatedRequest;
    try {
      const { targetId } = req.params;
      const admin = isUserAdmin(user);

      let matrices: Array<{ id: string }>;
      if (admin) {
        matrices = (await db
          .prepare(
            `SELECT DISTINCT m.*
             FROM matrices m
             JOIN matrix_positions mp ON m.id = mp.matrix_id
             WHERE m.status = 'OPEN' AND mp.user_id = ?`
          )
          .all(targetId)) as Array<{ id: string }>;
      } else {
        matrices = (await db
          .prepare(
            `SELECT DISTINCT m.*
             FROM matrices m
             JOIN matrix_positions mp_target ON m.id = mp_target.matrix_id
             JOIN matrix_positions mp_requester ON m.id = mp_requester.matrix_id
             WHERE m.status = 'OPEN'
             AND mp_target.user_id = ?
             AND mp_requester.user_id = ?`
          )
          .all(targetId, user.id)) as Array<{ id: string }>;
      }

      if (matrices.length === 0) {
        return res.json([]);
      }

      let allPositions: MatrixPositionRow[];
      if (admin) {
        allPositions = (await db
          .prepare(
            `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
             u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
             u.balance as balance, u.avatar
             FROM matrix_positions mp
             JOIN users u ON mp.user_id = u.id
             JOIN matrices m ON mp.matrix_id = m.id
             WHERE m.status = 'OPEN' AND mp.matrix_id IN (
               SELECT m2.id FROM matrices m2
               JOIN matrix_positions mp2 ON m2.id = mp2.matrix_id
               WHERE m2.status = 'OPEN' AND mp2.user_id = ?
             )`
          )
          .all(targetId)) as MatrixPositionRow[];
      } else {
        allPositions = (await db
          .prepare(
            `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
             u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
             u.balance as balance, u.avatar
             FROM matrix_positions mp
             JOIN users u ON mp.user_id = u.id
             WHERE mp.matrix_id IN (
               SELECT m2.id FROM matrices m2
               JOIN matrix_positions mp_target ON m2.id = mp_target.matrix_id
               JOIN matrix_positions mp_requester ON m2.id = mp_requester.matrix_id
               WHERE m2.status = 'OPEN' AND mp_target.user_id = ? AND mp_requester.user_id = ?
             )`
          )
          .all(targetId, user.id)) as MatrixPositionRow[];
      }

      const result = matrices.map((m) => {
        const positions = allPositions
          .filter((p) => p.matrix_id === m.id)
          .map((p) => ({
            ...p,
            userName: p.name,
            userNickname: p.nickname,
            status: p.status,
            careerLevel: p.careerLevel,
            balance: p.balance,
            avatar: p.avatar,
          }));
        return { ...m, positions };
      });

      const uniqueResult = Array.from(new Map(result.map((m) => [m.id, m])).values());
      res.json(uniqueResult);
    } catch (err) {
      console.error("Error in /api/user/matrix/:targetId:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  return router;
}
