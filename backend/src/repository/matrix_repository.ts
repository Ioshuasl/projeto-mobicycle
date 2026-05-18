import { db, generateId } from "../config/db.ts";
import type { MatrixCycleRow } from "../interfaces/matrix.ts";

export type MatrixPositionRow = {
  matrix_id: string;
  position: number;
  userId: string;
  name: string;
  nickname: string;
  referralsCount: number;
  status: string;
  careerLevel: string;
  balance: number;
  cycleSalesCount?: number;
  avatar?: string | null;
};

function groupPositionsByMatrix(
  positions: MatrixPositionRow[]
): Record<string, Array<MatrixPositionRow & { userName: string; userNickname: string }>> {
  return positions.reduce<
    Record<string, Array<MatrixPositionRow & { userName: string; userNickname: string }>>
  >((acc, p) => {
    if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
    acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
    return acc;
  }, {});
}

function attachPositions(
  matrices: Array<Record<string, unknown> & { id: string }>,
  positionsByMatrix: Record<string, Array<MatrixPositionRow & { userName: string; userNickname: string }>>
): Record<string, unknown>[] {
  return matrices.map((m) => ({
    ...m,
    positions: positionsByMatrix[m.id] || [],
  }));
}

const POSITIONS_LIST_SELECT = `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
  u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
  u.balance as balance, u.cycle_sales_count as cycleSalesCount`;

const POSITIONS_TARGET_SELECT = `SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname,
  u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel,
  u.balance as balance, u.avatar`;

export const matrixRepository = {
  async findCyclesByUserId(userId: string): Promise<MatrixCycleRow[]> {
    const rows = (await db
      .prepare("SELECT * FROM matrix_cycles WHERE user_id = ? ORDER BY created_at DESC")
      .all(userId)) as MatrixCycleRow[];
    return Array.from(new Map(rows.map((h) => [h.id, h])).values());
  },

  async findOpenMatricesAdmin(
    type: string | undefined,
    limit: number,
    offset: number
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    let query = "SELECT * FROM matrices WHERE status = 'OPEN'";
    const params: unknown[] = [];
    if (type) {
      query += " AND type = ?";
      params.push(type);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
    params.push(limit, offset);
    return (await db.prepare(query).all(...params)) as Array<Record<string, unknown> & { id: string }>;
  },

  async findOpenMatricesForUser(
    userId: string,
    type: string | undefined
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    let query = `
      SELECT DISTINCT m.*
      FROM matrices m
      JOIN matrix_positions mp ON m.id = mp.matrix_id
      WHERE m.status = 'OPEN' AND mp.user_id = ?
    `;
    const params: unknown[] = [userId];
    if (type) {
      query += " AND m.type = ?";
      params.push(type);
    }
    return (await db.prepare(query).all(...params)) as Array<Record<string, unknown> & { id: string }>;
  },

  async findPositionsByMatrixIds(matrixIds: string[]): Promise<MatrixPositionRow[]> {
    if (matrixIds.length === 0) return [];
    const placeholders = matrixIds.map(() => "?").join(",");
    return (await db
      .prepare(
        `${POSITIONS_LIST_SELECT}
         FROM matrix_positions mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.matrix_id IN (${placeholders})`
      )
      .all(...matrixIds)) as MatrixPositionRow[];
  },

  async findPositionsForUserMatrices(userId: string): Promise<MatrixPositionRow[]> {
    return (await db
      .prepare(
        `${POSITIONS_LIST_SELECT}
         FROM matrix_positions mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.matrix_id IN (
           SELECT matrix_id FROM matrix_positions WHERE user_id = ?
         )`
      )
      .all(userId)) as MatrixPositionRow[];
  },

  attachPositionsToMatrices(
    matrices: Array<Record<string, unknown> & { id: string }>,
    positions: MatrixPositionRow[]
  ): Record<string, unknown>[] {
    return attachPositions(matrices, groupPositionsByMatrix(positions));
  },

  async hasActiveOpenPosition(userId: string): Promise<boolean> {
    const row = await db
      .prepare(
        `SELECT mp.matrix_id FROM matrix_positions mp
         JOIN matrices m ON mp.matrix_id = m.id
         WHERE mp.user_id = ? AND m.status = 'OPEN'`
      )
      .get(userId);
    return Boolean(row);
  },

  async findOpenOnbordByReferrer(referrerId: string): Promise<{ id: string } | null> {
    return (await db
      .prepare(
        `SELECT m.id
         FROM matrices m
         JOIN matrix_positions mp ON m.id = mp.matrix_id
         WHERE mp.user_id = ? AND m.type = 'ONBORD' AND m.status = 'OPEN'
         LIMIT 1`
      )
      .get(referrerId)) as { id: string } | null;
  },

  async findFirstOpenOnbord(): Promise<{ id: string } | null> {
    const rows = await this.findOpenOnbordIds();
    return rows.length > 0 ? rows[0] : null;
  },

  async findPositionInMatrix(matrixId: string, userId: string): Promise<unknown | null> {
    return db
      .prepare("SELECT * FROM matrix_positions WHERE matrix_id = ? AND user_id = ?")
      .get(matrixId, userId);
  },

  async createMatrix(type: "ONBORD" | "CASHBOARD"): Promise<{ id: string; type: string }> {
    const id = generateId("matrix");
    await db.prepare("INSERT INTO matrices (id, type, status) VALUES (?, ?, 'OPEN')").run(id, type);
    return { id, type };
  },

  async findOpenPositionForUser(
    userId: string
  ): Promise<{ type: string; position: number } | null> {
    return (await db
      .prepare(
        `SELECT m.type, mp.position
         FROM matrix_positions mp
         JOIN matrices m ON mp.matrix_id = m.id
         WHERE mp.user_id = ? AND m.status = 'OPEN'
         LIMIT 1`
      )
      .get(userId)) as { type: string; position: number } | null;
  },

  async findOpenOnbordIds(): Promise<Array<{ id: string }>> {
    return (await db
      .prepare(
        "SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC"
      )
      .all()) as Array<{ id: string }>;
  },

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

  async findOpenMatricesForTargetAdmin(
    targetId: string
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    return (await db
      .prepare(
        `SELECT DISTINCT m.*
         FROM matrices m
         JOIN matrix_positions mp ON m.id = mp.matrix_id
         WHERE m.status = 'OPEN' AND mp.user_id = ?`
      )
      .all(targetId)) as Array<Record<string, unknown> & { id: string }>;
  },

  async findOpenMatricesSharedWithRequester(
    targetId: string,
    requesterId: string
  ): Promise<Array<Record<string, unknown> & { id: string }>> {
    return (await db
      .prepare(
        `SELECT DISTINCT m.*
         FROM matrices m
         JOIN matrix_positions mp_target ON m.id = mp_target.matrix_id
         JOIN matrix_positions mp_requester ON m.id = mp_requester.matrix_id
         WHERE m.status = 'OPEN'
         AND mp_target.user_id = ?
         AND mp_requester.user_id = ?`
      )
      .all(targetId, requesterId)) as Array<Record<string, unknown> & { id: string }>;
  },

  async findPositionsForTargetAdmin(targetId: string): Promise<MatrixPositionRow[]> {
    return (await db
      .prepare(
        `${POSITIONS_TARGET_SELECT}
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
  },

  async findPositionsForTargetShared(
    targetId: string,
    requesterId: string
  ): Promise<MatrixPositionRow[]> {
    return (await db
      .prepare(
        `${POSITIONS_TARGET_SELECT}
         FROM matrix_positions mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.matrix_id IN (
           SELECT m2.id FROM matrices m2
           JOIN matrix_positions mp_target ON m2.id = mp_target.matrix_id
           JOIN matrix_positions mp_requester ON m2.id = mp_requester.matrix_id
           WHERE m2.status = 'OPEN' AND mp_target.user_id = ? AND mp_requester.user_id = ?
         )`
      )
      .all(targetId, requesterId)) as MatrixPositionRow[];
  },

  buildUserMatrixView(
    matrices: Array<Record<string, unknown> & { id: string }>,
    allPositions: MatrixPositionRow[]
  ): Record<string, unknown>[] {
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
    return Array.from(new Map(result.map((m) => [m.id, m])).values());
  },

  /** Matrizes ONBORD abertas com posições para bootstrap `/api/init`. */
  async findOpenOnbordWithPositionsForInit(
    adminView: boolean,
    userId: string
  ): Promise<Record<string, unknown>[]> {
    if (adminView) {
      const matrices = (await db
        .prepare("SELECT * FROM matrices WHERE status = 'OPEN' AND type = 'ONBORD'")
        .all()) as Array<Record<string, unknown> & { id: string }>;

      if (matrices.length === 0) return [];

      const allPositions = (await db.prepare(`
        ${POSITIONS_LIST_SELECT}
        FROM matrix_positions mp
        JOIN users u ON mp.user_id = u.id
        JOIN matrices m ON mp.matrix_id = m.id
        WHERE m.status = 'OPEN' AND m.type = 'ONBORD'
      `).all()) as MatrixPositionRow[];

      return this.attachPositionsToMatrices(matrices, allPositions);
    }

    const matrices = await this.findOpenMatricesForUser(userId, "ONBORD");
    if (matrices.length === 0) return [];

    const allPositions = (await db
      .prepare(
        `${POSITIONS_LIST_SELECT}
         FROM matrix_positions mp
         JOIN users u ON mp.user_id = u.id
         WHERE mp.matrix_id IN (
           SELECT matrix_id FROM matrix_positions WHERE user_id = ?
         ) AND mp.matrix_id IN (SELECT id FROM matrices WHERE type = 'ONBORD')`
      )
      .all(userId)) as MatrixPositionRow[];

    return this.attachPositionsToMatrices(matrices, allPositions);
  },

  async findOpenSummaryForAdmin(): Promise<unknown[]> {
    return db.prepare(`
      SELECT m.id, m.type, m.status, m.created_at as createdAt,
             (SELECT COUNT(*) FROM matrix_positions WHERE matrix_id = m.id) as filledPositions
      FROM matrices m
      WHERE m.status = 'OPEN'
      ORDER BY m.created_at DESC
    `).all();
  },

  async findById(id: string): Promise<Record<string, unknown> | null> {
    return (await db.prepare("SELECT * FROM matrices WHERE id = ?").get(id)) as Record<
      string,
      unknown
    > | null;
  },

  async findAdminDetailsPositions(matrixId: string): Promise<unknown[]> {
    return db.prepare(`
      SELECT mp.position, u.id as userId, u.name, u.nickname, u.email, u.status,
             u.career_level as careerLevel, u.referrals_count as referralsCount
      FROM matrix_positions mp
      JOIN users u ON mp.user_id = u.id
      WHERE mp.matrix_id = ?
      ORDER BY mp.position ASC
    `).all(matrixId);
  },

  async findAdminDetailsHistory(matrixId: string): Promise<unknown[]> {
    return db.prepare(`
      SELECT mh.*, u.name as userName
      FROM matrix_history mh
      JOIN users u ON mh.user_id = u.id
      WHERE mh.matrix_id = ?
      ORDER BY mh.created_at DESC
      LIMIT 50
    `).all(matrixId);
  },

  async findAdminDetailsCycles(matrixId: string): Promise<unknown[]> {
    return db.prepare(`
      SELECT mc.*, u.name as userName
      FROM matrix_cycles mc
      JOIN users u ON mc.user_id = u.id
      WHERE mc.matrix_id = ?
      ORDER BY mc.created_at DESC
      LIMIT 50
    `).all(matrixId);
  },
};
