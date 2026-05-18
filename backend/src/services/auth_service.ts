import crypto from "crypto";
import { hashPassword, verifyPassword } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import type { PublicUser } from "../interfaces/user.ts";
import { generateToken } from "../middlewares/auth.middleware.ts";
import { settingsRepository } from "../repository/settings_repository.ts";
import { userRepository } from "../repository/user_repository.ts";
import { voucherRepository } from "../repository/voucher_repository.ts";
import { NotificationManager } from "./notification_manager.ts";
import { generateReferralCode } from "../utils/referral.ts";

const RESET_TOKEN_TTL_MS = 15 * 60 * 1000;

function normalizeOptionalId(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed || undefined;
}

async function resolveReferrerForRegister(
  referrerId?: string,
  referralCode?: string
): Promise<string | null> {
  let finalReferrerId = normalizeOptionalId(referrerId);
  const code = normalizeOptionalId(referralCode);

  if (code && !finalReferrerId) {
    const referrer = await userRepository.findReferrerByCodeOrNickname(code);
    if (!referrer) {
      throw new HttpError(400, "Código de indicação inválido.");
    }
    finalReferrerId = referrer.id;
  }

  if (finalReferrerId) {
    const exists = await userRepository.existsById(finalReferrerId);
    if (!exists) {
      throw new HttpError(
        400,
        "Indicador inválido. Verifique o link ou código de indicação."
      );
    }
  }

  return finalReferrerId ?? null;
}

export type ForgotPasswordResult =
  | { success: true; message: string }
  | { success: true; resetToken: string };

export type AuthSessionResult = PublicUser & { token: string };

export type RegisterInput = {
  name: string;
  email: string;
  password: string;
  cpf: string;
  phone: string;
  nickname?: string;
  birthDate?: string;
  referrerId?: string;
  referralCode?: string;
  firebaseUid?: string;
};

export const authService = {
  async forgotPassword(email?: string, cpf?: string): Promise<ForgotPasswordResult> {
    const user = await userRepository.findIdByEmailAndCpf(email ?? "", cpf ?? "");

    if (!user) {
      return {
        success: true,
        message: "Se os dados estiverem corretos, um token de recuperação será gerado.",
      };
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    await settingsRepository.saveResetToken(resetToken, {
      userId: user.id,
      expiresAt,
    });

    return { success: true, resetToken };
  },

  async resetPassword(resetToken?: string, newPassword?: string): Promise<{ success: true }> {
    if (!resetToken || !newPassword) {
      throw new HttpError(400, "Dados incompletos");
    }
    if (newPassword.length < 6) {
      throw new HttpError(400, "A senha deve ter pelo menos 6 caracteres");
    }

    const payload = await settingsRepository.getResetToken(resetToken);
    if (!payload) {
      throw new HttpError(400, "Token de recuperação inválido ou expirado");
    }

    if (new Date(payload.expiresAt) < new Date()) {
      await settingsRepository.deleteByKey(`reset_token_${resetToken}`);
      throw new HttpError(400, "Token de recuperação expirado. Solicite um novo.");
    }

    const hashedPassword = await hashPassword(newPassword);
    await userRepository.updatePassword(payload.userId, hashedPassword);
    await settingsRepository.deleteByKey(`reset_token_${resetToken}`);

    return { success: true };
  },

  async login(email: string, password: string): Promise<AuthSessionResult> {
    const userRecord = await userRepository.findByEmailForLogin(email);

    if (!userRecord || !(await verifyPassword(password, userRecord.password))) {
      throw new HttpError(401, "Usuário não encontrado ou credenciais inválidas");
    }

    if (
      !userRecord.password.startsWith("$2b$") &&
      !userRecord.password.startsWith("$2a$")
    ) {
      const bcryptHash = await hashPassword(password);
      await userRepository.updatePassword(userRecord.id, bcryptHash);
    }

    const { password: _pw, ...userWithoutPassword } = userRecord;
    const token = generateToken(userRecord.id, userRecord.email);

    return { ...userWithoutPassword, token };
  },

  async register(input: RegisterInput): Promise<AuthSessionResult> {
    const { name, email, password, cpf, phone, nickname, birthDate, firebaseUid } = input;
    let { referrerId, referralCode } = input;

    const existingUser = await userRepository.findByEmailOrCpf(email, cpf);
    if (existingUser) {
      throw new HttpError(400, "Email ou CPF já cadastrado");
    }

    if (firebaseUid) {
      const existingFirebase = await userRepository.findByFirebaseUid(firebaseUid);
      if (existingFirebase) {
        throw new HttpError(400, "Este usuário já possui um cadastro vinculado.");
      }
    }

    const existingNickname = await userRepository.findByNickname(nickname);
    if (existingNickname) {
      throw new HttpError(400, "Este apelido já está sendo usado por outro usuário.");
    }

    const finalReferrerId = await resolveReferrerForRegister(referrerId, referralCode);

    const id = userRepository.createUserId();
    const newReferralCode = generateReferralCode(name);
    const hashedPassword = password ? await hashPassword(password) : null;

    await userRepository.insertUser({
      id,
      firebaseUid: firebaseUid ?? null,
      name,
      nickname,
      email,
      hashedPassword,
      cpf,
      phone,
      birthDate,
      referrerId: finalReferrerId,
      referralCode: newReferralCode,
    });

    const pendingVouchers = await voucherRepository.findPendingByEmailOrPhone(email, phone);
    for (const v of pendingVouchers) {
      await voucherRepository.assignToUser(v.id, id);
      await NotificationManager.createNotification(
        id,
        "VOUCHER_RECEIVED",
        `Você recebeu um voucher de presente de R$ ${v.amount.toFixed(2)} que estava aguardando seu cadastro! 🎁`
      );
    }

    const user = await userRepository.findPublicById(id);
    if (!user) {
      throw new HttpError(500, "Erro ao carregar usuário após cadastro");
    }

    const token = generateToken(id, email);
    return { ...user, token };
  },
};
