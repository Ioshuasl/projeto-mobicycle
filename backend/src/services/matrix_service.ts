import { getSetting } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import type { MatrixActionOutcome, MatrixJoinResult, MatrixListQuery } from "../interfaces/matrix.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { matrixRepository } from "../repository/matrix_repository.ts";
import { userRepository } from "../repository/user_repository.ts";
import { FinancialManager } from "./financial_manager.ts";
import { MatrixManager } from "./matrix_manager.ts";

export const matrixService = {
  async getHistory(userId: string) {
    return matrixRepository.findCyclesByUserId(userId);
  },

  async listMatrices(requester: AuthUser, query: MatrixListQuery) {
    const admin = isUserAdmin(requester);
    const type = query.type;
    const page = parseInt(String(query.page ?? "1"), 10) || 1;
    const limit = parseInt(String(query.limit ?? "10"), 10) || 10;
    const offset = (page - 1) * limit;

    if (admin) {
      const matrices = await matrixRepository.findOpenMatricesAdmin(type, limit, offset);
      if (matrices.length === 0) {
        return [];
      }
      const positions = await matrixRepository.findPositionsByMatrixIds(
        matrices.map((m) => m.id)
      );
      return matrixRepository.attachPositionsToMatrices(matrices, positions);
    }

    const matrices = await matrixRepository.findOpenMatricesForUser(requester.id, type);
    if (matrices.length === 0) {
      return [];
    }
    const positions = await matrixRepository.findPositionsForUserMatrices(requester.id);
    return matrixRepository.attachPositionsToMatrices(matrices, positions);
  },

  async join(
    requester: AuthUser,
    userId: string,
    referrerId?: string
  ): Promise<MatrixActionOutcome> {
    if (!userId) {
      throw new HttpError(400, "userId é obrigatório");
    }
    if (requester.id !== userId && !isUserAdmin(requester)) {
      throw new HttpError(403, "Acesso negado");
    }

    if (await matrixRepository.hasActiveOpenPosition(userId)) {
      throw new HttpError(
        400,
        "Você já possui uma posição ativa no sistema (On-Board ou Cash-Board). Aguarde o ciclo para reentrar."
      );
    }

    const formationRule = await getSetting("matrix_formation_rule", "FILL_BASE");
    let matrix: { id: string } | null = null;

    if (formationRule === "FOLLOW_REFERRER" && referrerId) {
      matrix = await matrixRepository.findOpenOnbordByReferrer(referrerId);
    }

    if (!matrix) {
      matrix = await matrixRepository.findFirstOpenOnbord();
    }

    if (!matrix) {
      matrix = await matrixRepository.createMatrix("ONBORD");
    }

    const existing = await matrixRepository.findPositionInMatrix(matrix.id, userId);
    if (existing) {
      throw new HttpError(400, "Usuário já está nesta matriz");
    }

    if (referrerId && referrerId !== userId) {
      await FinancialManager.addReferralBonus(referrerId, userId);
      const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
      await FinancialManager.payInfiniteBonus(userId, adhesionFee);
      await FinancialManager.payLicenseUnilevelBonus(userId);
    }

    const result: MatrixJoinResult = await MatrixManager.fillPosition(matrix.id, userId);
    if (result.error) {
      return { ok: false, body: result };
    }

    await FinancialManager.incrementNetworkSales(userId);
    await userRepository.promoteToBronzeIfPartner(userId);

    return { ok: true, cycleInfo: result.cycleInfo };
  },

  async reentry(requester: AuthUser, userId: string): Promise<MatrixActionOutcome> {
    if (!userId) {
      throw new HttpError(400, "userId é obrigatório");
    }
    if (requester.id !== userId && !isUserAdmin(requester)) {
      throw new HttpError(403, "Acesso negado");
    }

    const result: MatrixJoinResult = await MatrixManager.processReentryInternal(userId);
    if (result.error) {
      return { ok: false, body: result };
    }

    return { ok: true, cycleInfo: result.cycleInfo };
  },

  async getUserMatrix(requester: AuthUser, targetId: string) {
    const admin = isUserAdmin(requester);

    const matrices = admin
      ? await matrixRepository.findOpenMatricesForTargetAdmin(targetId)
      : await matrixRepository.findOpenMatricesSharedWithRequester(targetId, requester.id);

    if (matrices.length === 0) {
      return [];
    }

    const allPositions = admin
      ? await matrixRepository.findPositionsForTargetAdmin(targetId)
      : await matrixRepository.findPositionsForTargetShared(targetId, requester.id);

    return matrixRepository.buildUserMatrixView(matrices, allPositions);
  },
};
