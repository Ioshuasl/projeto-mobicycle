import { db, generateId } from "../config/db.ts";
import type { PublicUser, SessionProfile, UserLoginRow } from "../interfaces/user.ts";

const USER_PROFILE_SELECT = `SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate,
  IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar,
  referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance,
  cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance,
  total_earnings as totalEarnings, document_status as documentStatus, stars, status,
  career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId,
  reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?`;

const USER_SELECT_PUBLIC = `SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate,
  IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar,
  referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback,
  voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus,
  stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId,
  reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?`;

const USER_SELECT_LOGIN = `SELECT id, password, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate,
  IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar,
  referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback,
  voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus,
  stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId,
  reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE email = ?`;

export type RegisterUserInput = {
  id: string;
  firebaseUid: string | null;
  name: string;
  nickname: string | undefined;
  email: string;
  hashedPassword: string | null;
  cpf: string;
  phone: string;
  birthDate: string | undefined;
  referrerId: string | null;
  referralCode: string;
};

export const userRepository = {
  async findIdByEmailAndCpf(email: string, cpf: string): Promise<{ id: string } | null> {
    return (await db
      .prepare("SELECT id FROM users WHERE email = ? AND cpf = ?")
      .get(email, cpf)) as { id: string } | null;
  },

  async findByEmailForLogin(email: string): Promise<UserLoginRow | null> {
    return (await db.prepare(USER_SELECT_LOGIN).get(email)) as UserLoginRow | null;
  },

  async updatePassword(userId: string, hashedPassword: string): Promise<void> {
    await db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
  },

  async findByEmailOrCpf(email: string, cpf: string): Promise<{ id: string } | null> {
    return (await db
      .prepare("SELECT id FROM users WHERE email = ? OR cpf = ?")
      .get(email, cpf)) as { id: string } | null;
  },

  async findByFirebaseUid(firebaseUid: string): Promise<{ id: string } | null> {
    return (await db
      .prepare("SELECT id FROM users WHERE firebase_uid = ?")
      .get(firebaseUid)) as { id: string } | null;
  },

  async findByNickname(nickname: string | undefined): Promise<{ id: string } | null> {
    if (!nickname) return null;
    return (await db
      .prepare("SELECT id FROM users WHERE nickname = ?")
      .get(nickname)) as { id: string } | null;
  },

  async findReferrerByCodeOrNickname(code: string): Promise<{ id: string } | null> {
    let referrer = (await db
      .prepare("SELECT id FROM users WHERE referral_code = ?")
      .get(code)) as { id: string } | null;

    if (!referrer) {
      referrer = (await db
        .prepare("SELECT id FROM users WHERE nickname = ?")
        .get(code)) as { id: string } | null;
    }

    return referrer;
  },

  async insertUser(input: RegisterUserInput): Promise<void> {
    await db
      .prepare(
        `INSERT INTO users (id, firebase_uid, name, nickname, email, password, cpf, phone, birth_date, referrer_id, referral_code, is_activated)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`
      )
      .run(
        input.id,
        input.firebaseUid,
        input.name,
        input.nickname,
        input.email,
        input.hashedPassword,
        input.cpf,
        input.phone,
        input.birthDate,
        input.referrerId,
        input.referralCode
      );
  },

  async findPublicById(id: string): Promise<PublicUser | null> {
    return (await db.prepare(USER_SELECT_PUBLIC).get(id)) as PublicUser | null;
  },

  async findSessionProfileById(id: string): Promise<SessionProfile | null> {
    return (await db.prepare(USER_PROFILE_SELECT).get(id)) as SessionProfile | null;
  },

  createUserId(): string {
    return generateId("user");
  },
};
