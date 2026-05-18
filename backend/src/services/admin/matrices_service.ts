import { getSetting } from "../../config/db.ts";
import { HttpError } from "../../interfaces/errors.ts";
import type { MatrixActionOutcome, MatrixJoinResult } from "../../interfaces/matrix.ts";
import { matrixRepository } from "../../repository/matrix_repository.ts";
import { userRepository } from "../../repository/user_repository.ts";
import { FinancialManager } from "../financial_manager.ts";
import { MatrixManager } from "../matrix_manager.ts";

export type AdminFillMatrixInput = {
  matrixId?: string;
  userId?: string;
  referrerId?: string;
};

export const adminMatricesService = {
  getSummary() {
    return matrixRepository.findOpenSummaryForAdmin();
  },

  async fillMatrix(input: AdminFillMatrixInput): Promise<MatrixActionOutcome> {
    const { matrixId, userId, referrerId } = input;

    if (!matrixId || !userId) {
      throw new HttpError(400, "matrixId e userId são obrigatórios");
    }

    if (!(await userRepository.existsById(userId))) {
      await userRepository.insertGuestUser(userId);
    }

    if (referrerId && referrerId !== userId) {
      await FinancialManager.addReferralBonus(referrerId, userId);
      const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
      await FinancialManager.payInfiniteBonus(userId, adhesionFee);
      await FinancialManager.payLicenseUnilevelBonus(userId);
    }

    if (await matrixRepository.hasActiveOpenPosition(userId)) {
      throw new HttpError(400, "Este usuário já possui uma posição ativa no sistema.");
    }

    const result: MatrixJoinResult = await MatrixManager.fillPosition(matrixId, userId);
    if (result.error) {
      return { ok: false, body: result };
    }

    await userRepository.promoteToBronzeIfPartner(userId);

    return { ok: true, cycleInfo: result.cycleInfo };
  },

  async getDetails(matrixId: string) {
    const matrix = await matrixRepository.findById(matrixId);
    if (!matrix) {
      throw new HttpError(404, "Matriz não encontrada");
    }

    const [positions, history, cycles] = await Promise.all([
      matrixRepository.findAdminDetailsPositions(matrixId),
      matrixRepository.findAdminDetailsHistory(matrixId),
      matrixRepository.findAdminDetailsCycles(matrixId),
    ]);

    return { ...matrix, positions, history, cycles };
  },
};
