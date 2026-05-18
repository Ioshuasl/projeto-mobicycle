import { getSetting } from "../../config/db.ts";
import { HttpError } from "../../interfaces/errors.ts";
import { documentRepository } from "../../repository/document_repository.ts";
import { transactionRepository } from "../../repository/transaction_repository.ts";
import { userRepository } from "../../repository/user_repository.ts";
import { NotificationManager } from "../notification_manager.ts";

const CLAWBACK_LEVEL_1_AMOUNT = 150;
const CLAWBACK_UPLINE_PERCENT = 0.04;
const CLAWBACK_MAX_LEVELS = 8;

export const adminTransactionsService = {
  listDocuments() {
    return documentRepository.findAllForAdmin();
  },

  listTransactions() {
    return transactionRepository.findAllForAdmin();
  },

  async processClawback(transactionId: string): Promise<void> {
    const transaction = await transactionRepository.findById(transactionId);

    if (!transaction || transaction.type !== "ADHESION" || transaction.status === "REJECTED") {
      throw new HttpError(400, "Transação inválida para estorno");
    }

    const buyerId = transaction.user_id;
    const referrerId = await userRepository.findReferrerId(buyerId);

    if (referrerId === null && !(await userRepository.existsById(buyerId))) {
      throw new HttpError(404, "Comprador não encontrado");
    }

    await transactionRepository.markRejectedByAdmin(transactionId);

    let currentReferrerId = referrerId;
    const visited = new Set<string>();

    if (currentReferrerId) {
      await userRepository.decrementCycleSalesCount(currentReferrerId);
      await NotificationManager.createNotification(
        currentReferrerId,
        "CLAWBACK",
        "Uma venda direta foi estornada. -1 ponto no ciclo vigente."
      );
    }

    const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));

    for (let level = 1; level <= CLAWBACK_MAX_LEVELS; level++) {
      if (!currentReferrerId || visited.has(currentReferrerId)) break;
      visited.add(currentReferrerId);

      const upline = await userRepository.findBalanceAndDebt(currentReferrerId);
      if (!upline) break;

      const commissionToClawback =
        level === 1 ? CLAWBACK_LEVEL_1_AMOUNT : adhesionFee * CLAWBACK_UPLINE_PERCENT;

      let newBalance = upline.balance;
      let newDebtBalance = upline.debt_balance;

      if (newBalance >= commissionToClawback) {
        newBalance -= commissionToClawback;
      } else {
        newDebtBalance += commissionToClawback - newBalance;
        newBalance = 0;
      }

      await userRepository.updateBalanceAndDebt(upline.id, newBalance, newDebtBalance);
      await transactionRepository.insertClawback(upline.id, commissionToClawback);
      await NotificationManager.createNotification(
        upline.id,
        "CLAWBACK",
        `Estorno de comissão processado (R$ ${commissionToClawback.toFixed(2)}).`
      );

      currentReferrerId = await userRepository.findReferrerId(currentReferrerId);
    }
  },
};
