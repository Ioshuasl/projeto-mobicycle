import { db } from "../config/db.ts";

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
};

function groupPositionsByMatrix(
  positions: MatrixPositionRow[]
): Record<string, Record<string, unknown>[]> {
  return positions.reduce<Record<string, Record<string, unknown>[]>>((acc, p) => {
    if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
    acc[p.matrix_id].push({
      ...p,
      userName: p.name,
      userNickname: p.nickname,
    });
    return acc;
  }, {});
}

function attachPositions(
  matrices: Record<string, unknown>[],
  positionsByMatrix: Record<string, Record<string, unknown>[]>
): Record<string, unknown>[] {
  return matrices.map((m) => ({
    ...m,
    positions: positionsByMatrix[m.id as string] || [],
  }));
}

export const matrixRepository = {
  async findClosedMatricesForUser(userId: string): Promise<unknown[]> {
    return db
      .prepare(
        `SELECT DISTINCT m.*
         FROM matrices m
         JOIN matrix_positions mp ON m.id = mp.matrix_id
         WHERE m.status = 'CLOSED' AND mp.user_id = ?
         ORDER BY m.id DESC`
      )
      .all(userId);
  },

  /** Matrizes ONBORD abertas com posições para bootstrap `/api/init`. */
  async findOpenOnbordWithPositionsForInit(
    adminView: boolean,
    userId: string
  ): Promise<Record<string, unknown>[]> {
    if (adminView) {
      const matrices = (await db
        .prepare("SELECT * FROM matrices WHERE status = 'OPEN' AND type = 'ONBORD'")
        .all()) as Record<string, unknown>[];

      if (matrices.length === 0) return [];

      const allPositions = (await db.prepare(`
        SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
          u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
          u.balance as balance, u.cycle_sales_count as cycleSalesCount
        FROM matrix_positions mp
        JOIN users u ON mp.user_id = u.id
        JOIN matrices m ON mp.matrix_id = m.id
        WHERE m.status = 'OPEN' AND m.type = 'ONBORD'
      `).all()) as MatrixPositionRow[];

      return attachPositions(matrices, groupPositionsByMatrix(allPositions));
    }

    const matrices = (await db
      .prepare(
        `SELECT DISTINCT m.*
         FROM matrices m
         JOIN matrix_positions mp ON m.id = mp.matrix_id
         WHERE m.status = 'OPEN' AND mp.user_id = ? AND m.type = 'ONBORD'`
      )
      .all(userId)) as Record<string, unknown>[];

    if (matrices.length === 0) return [];

    const allPositions = (await db
      .prepare(
        `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
          u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
          u.balance as balance, u.cycle_sales_count as cycleSalesCount
         FROM matrix_positions mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.matrix_id IN (
           SELECT matrix_id FROM matrix_positions WHERE user_id = ?
         ) AND mp.matrix_id IN (SELECT id FROM matrices WHERE type = 'ONBORD')`
      )
      .all(userId)) as MatrixPositionRow[];

    return attachPositions(matrices, groupPositionsByMatrix(allPositions));
  },
};
