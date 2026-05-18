import md5 from "md5";
import { withTransaction } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import { resolveCashbackColumn } from "../interfaces/financial.ts";
import { transactionRepository } from "../repository/transaction_repository.ts";
import { userRepository } from "../repository/user_repository.ts";
import { voucherRepository } from "../repository/voucher_repository.ts";
import { sendNotificationEmail } from "../utils/email.ts";
import { FinancialManager } from "./financial_manager.ts";
import { NotificationManager } from "./notification_manager.ts";

const VOUCHER_RULE_MESSAGE =
  "Regra: Somente cadastrados diretos podem usar este voucher em corridas no app de mobilidade.";

function buildRegistrationLink(senderEmail: string | null, senderNickname: string | null): string {
  const appUrl = process.env.APP_URL || "https://www.mobicycle.com.br";
  return `${appUrl}/?ref=${md5(senderEmail || "")}/${senderNickname || ""}`;
}

function buildVoucherReceivedMessage(
  senderName: string,
  amount: number,
  registrationLink: string
): string {
  return `Você recebeu um voucher de R$ ${amount.toFixed(2)} de ${senderName}! 🎁\n\n${VOUCHER_RULE_MESSAGE}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
}

export const financialService = {
  async listTransactions(userId: string) {
    const transactions = await transactionRepository.findListedByUserId(userId);
    const adhesion = transactions.filter((t) => t.type === "ADHESION");
    console.log("[debug:license][/api/transactions]", {
      userId,
      total: transactions.length,
      adhesionCount: adhesion.length,
      lastTypes: transactions.slice(0, 5).map((t) => t.type),
    });
    return transactions;
  },

  async listVouchers(userId: string) {
    return voucherRepository.findForUser(userId);
  },

  async useCashback(userId: string, amount: number, serviceName: string) {
    if (!amount || amount <= 0) {
      throw new HttpError(400, "Valor inválido");
    }
    if (!serviceName) {
      throw new HttpError(400, "Nome do serviço é obrigatório");
    }

    const balanceColumn = resolveCashbackColumn(serviceName);
    const balance = await userRepository.getCashbackBalance(userId, balanceColumn);

    if (balance === null || balance < amount) {
      throw new HttpError(400, `Saldo de cashback ${serviceName} insuficiente`);
    }

    await withTransaction(async () => {
      await userRepository.deductCashback(userId, balanceColumn, amount);
      await transactionRepository.insertWithdrawal(
        userId,
        amount,
        `Uso de Cashback: ${serviceName}`
      );
      await FinancialManager.payCashbackUsageUnilevelBonus(userId, amount, serviceName);
    });

    return { success: true, message: `Serviço ${serviceName} pago com sucesso!` };
  },

  async deposit(userId: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new HttpError(400, "Valor de depósito inválido");
    }
    const user = await FinancialManager.processDeposit(userId, amount);
    return { success: true, user };
  },

  async withdraw(userId: string, amount: number, pixKey: string) {
    if (!amount || amount <= 0) {
      throw new HttpError(400, "Valor de saque inválido");
    }
    if (!pixKey) {
      throw new HttpError(400, "Chave PIX é obrigatória");
    }
    try {
      const user = await FinancialManager.requestWithdrawal(userId, amount, pixKey);
      return { success: true, user };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao processar saque";
      throw new HttpError(400, message);
    }
  },

  async purchaseVoucher(userId: string, amount: number) {
    if (!amount || amount <= 0) {
      throw new HttpError(400, "Valor inválido");
    }

    const balance = await userRepository.getCashbackBalance(userId, "cashback_balance");
    if (balance === null || balance < amount) {
      throw new HttpError(400, "Saldo de cashback insuficiente");
    }

    const voucherId = voucherRepository.createVoucherId();
    const voucherCode = voucherRepository.createVoucherCode();

    await withTransaction(async () => {
      await userRepository.deductCashback(userId, "cashback_balance", amount);
      await voucherRepository.insertAvailable(voucherId, voucherCode, amount, userId);
      await transactionRepository.insertWithdrawal(
        userId,
        amount,
        `Compra de Voucher: ${voucherCode}`
      );
    });

    return { success: true, voucher: { id: voucherId, code: voucherCode, amount } };
  },

  async sendVoucher(
    senderId: string,
    voucherId: string,
    recipientId?: string,
    recipientEmail?: string,
    recipientPhone?: string
  ) {
    if (!voucherId || (!recipientId && !recipientEmail && !recipientPhone)) {
      throw new HttpError(400, "Dados incompletos");
    }

    const sender = await userRepository.findVoucherSenderProfile(senderId);
    if (!sender) {
      throw new HttpError(404, "Remetente não encontrado");
    }

    const voucher = await voucherRepository.findOwnedAvailableOrSent(voucherId, senderId);
    if (!voucher) {
      throw new HttpError(400, "Voucher não disponível ou não pertence a você");
    }

    const registrationLink = buildRegistrationLink(sender.email, sender.nickname);

    if (recipientId) {
      const recipient = await userRepository.findDirectReferral(recipientId, senderId);
      if (!recipient) {
        throw new HttpError(
          400,
          "O destinatário deve ser um indicado direto na sua rede para poder usar o voucher."
        );
      }

      await withTransaction(async () => {
        await voucherRepository.transferToUser(voucherId, recipientId);
        await NotificationManager.createNotification(
          recipientId,
          "VOUCHER_RECEIVED",
          buildVoucherReceivedMessage(sender.name, voucher.amount, registrationLink)
        );
      });
      return { success: true };
    }

    if (recipientEmail) {
      const existingUser = await userRepository.findByEmailWithReferrer(recipientEmail);
      if (existingUser) {
        if (existingUser.referrer_id !== senderId) {
          throw new HttpError(400, "Este usuário já está cadastrado sob outro indicador.");
        }
        await withTransaction(async () => {
          await voucherRepository.transferToUser(voucherId, existingUser.id);
          await NotificationManager.createNotification(
            existingUser.id,
            "VOUCHER_RECEIVED",
            buildVoucherReceivedMessage(sender.name, voucher.amount, registrationLink)
          );
        });
      } else {
        await voucherRepository.markSentToEmail(voucherId, recipientEmail);
        const emailSubject = `🎁 Você recebeu um presente de ${sender.name}!`;
        const emailBody = `Olá!\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${VOUCHER_RULE_MESSAGE}\n\nApós o cadastro, seu voucher estará disponível na sua conta.\n\nEquipe Mobicyclo`;
        await sendNotificationEmail(recipientEmail, emailSubject, emailBody);
      }
      return { success: true };
    }

    if (recipientPhone) {
      const existingUser = await userRepository.findByPhoneWithReferrer(recipientPhone);
      if (existingUser) {
        if (existingUser.referrer_id !== senderId) {
          throw new HttpError(400, "Este usuário já está cadastrado sob outro indicador.");
        }
        await withTransaction(async () => {
          await voucherRepository.transferToUser(voucherId, existingUser.id);
          await NotificationManager.createNotification(
            existingUser.id,
            "VOUCHER_RECEIVED",
            buildVoucherReceivedMessage(sender.name, voucher.amount, registrationLink)
          );
        });
      } else {
        await voucherRepository.markSentToPhone(voucherId, recipientPhone);
      }

      const waMessage = `Olá! 🎁\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${VOUCHER_RULE_MESSAGE}\n\nApós o cadastro, seu voucher estará disponível na sua conta.`;
      const waUrl = `https://wa.me/${recipientPhone.replace(/\D/g, "")}?text=${encodeURIComponent(waMessage)}`;
      return { success: true, whatsappUrl: waUrl };
    }

    return { success: true };
  },
};
