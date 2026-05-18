import { db, generateId, withTransaction } from "../config/db.ts";
import type { CashbackBalanceColumn } from "../interfaces/financial.ts";
import type { AdminEditableUserField } from "../interfaces/admin/users.ts";
import type {
  NetworkReferralRow,
  PublicUser,
  ReferralListItem,
  SessionProfile,
  UserLoginRow,
  UserProfileAfterUpdate,
  UserUpdatePayload,
} from "../interfaces/user.ts";

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

const USER_UPDATE_SELECT = `SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, avatar,
  referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback,
  voucher_balance as voucherBalance, document_status as documentStatus, stars, status,
  career_level as careerLevel, referral_code as referralCode, reentry_mode as reentryMode,
  bank_name as bankName, bank_agency as bankAgency, bank_account as bankAccount,
  bank_account_type as bankAccountType, is_activated as isActivated FROM users WHERE id = ?`;

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
  async countForAdmin(search: string): Promise<number> {
    let query = "SELECT COUNT(*) as count FROM users";
    const params: string[] = [];
    if (search) {
      query +=
        " WHERE name LIKE ? OR email LIKE ? OR id LIKE ? OR nickname LIKE ? ";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    const row = (await db.prepare(query).get(...params)) as { count: number };
    return row.count;
  },

  async findPaginatedForAdmin(
    search: string,
    limit: number,
    offset: number
  ): Promise<unknown[]> {
    let query = `
      SELECT
        id, name, nickname, email, cpf, phone,
        pix_key as pixKey, birth_date as birthDate, avatar,
        referrals_count as referralsCount, balance,
        debt_balance as debtBalance, cashback_balance,
        snack_fast_cashback, energy_cashback, guincho_cashback, hability_test_cashback,
        voucher_balance as voucherBalance, document_status as documentStatus,
        stars, status, career_level as careerLevel,
        referral_code as referralCode, reentry_mode as reentryMode
      FROM users
    `;
    const params: string[] = [];
    if (search) {
      query += " WHERE name LIKE ? OR email LIKE ? OR id LIKE ? OR nickname LIKE ? ";
      const searchParam = `%${search}%`;
      params.push(searchParam, searchParam, searchParam, searchParam);
    }
    query += " ORDER BY created_at DESC LIMIT ? OFFSET ? ";
    return db.prepare(query).all(...params, limit, offset);
  },

  async updateStatus(userId: string, status: string): Promise<void> {
    await db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, userId);
  },

  async updateAdminField(
    userId: string,
    field: AdminEditableUserField,
    value: unknown
  ): Promise<void> {
    await db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(value, userId);
  },

  async findForAdminDelete(
    userId: string
  ): Promise<{ id: string; email: string | null; role: string | null } | null> {
    return (await db
      .prepare("SELECT id, email, role FROM users WHERE id = ?")
      .get(userId)) as { id: string; email: string | null; role: string | null } | null;
  },

  async deleteUserAndRelations(userId: string): Promise<void> {
    await withTransaction(async () => {
      await db.prepare("UPDATE users SET referrer_id = NULL WHERE referrer_id = ?").run(userId);
      await db.prepare("DELETE FROM user_badges WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM badges WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM matrix_history WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM matrix_cycles WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM matrix_positions WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM notifications WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM transactions WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM documents WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM mercadopago_deposit_orders WHERE user_id = ?").run(userId);
      await db.prepare("DELETE FROM license_checkouts WHERE user_id = ?").run(userId);
      await db
        .prepare("DELETE FROM vouchers WHERE owner_id = ? OR recipient_id = ?")
        .run(userId, userId);
      await db.prepare("DELETE FROM users WHERE id = ?").run(userId);
    });
  },

  async findAdminNetworkReferrals(referrerId: string): Promise<Record<string, unknown>[]> {
    return (await db
      .prepare(
        `SELECT id, name, nickname, status, career_level as careerLevel, avatar,
         referrals_count as referralsCount, created_at as createdAt
         FROM users
         WHERE referrer_id = ?`
      )
      .all(referrerId)) as Record<string, unknown>[];
  },

  async findReferrerId(userId: string): Promise<string | null> {
    const row = (await db
      .prepare("SELECT referrer_id FROM users WHERE id = ?")
      .get(userId)) as { referrer_id: string | null } | null;
    return row?.referrer_id ?? null;
  },

  async decrementCycleSalesCount(userId: string): Promise<void> {
    await db
      .prepare(
        "UPDATE users SET cycle_sales_count = GREATEST(0, cycle_sales_count - 1) WHERE id = ?"
      )
      .run(userId);
  },

  async findBalanceAndDebt(
    userId: string
  ): Promise<{ id: string; balance: number; debt_balance: number } | null> {
    return (await db
      .prepare("SELECT id, balance, debt_balance FROM users WHERE id = ?")
      .get(userId)) as { id: string; balance: number; debt_balance: number } | null;
  },

  async updateBalanceAndDebt(
    userId: string,
    balance: number,
    debtBalance: number
  ): Promise<void> {
    await db
      .prepare("UPDATE users SET balance = ?, debt_balance = ? WHERE id = ?")
      .run(balance, debtBalance, userId);
  },

  async existsById(id: string): Promise<boolean> {
    const row = await db.prepare("SELECT id FROM users WHERE id = ?").get(id);
    return Boolean(row);
  },

  async insertGuestUser(userId: string): Promise<void> {
    await db
      .prepare("INSERT INTO users (id, name, email, cpf) VALUES (?, ?, ?, ?)")
      .run(userId, `Convidado ${userId}`, `${userId}@example.com`, `CPF-${userId}`);
  },

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

  async findAvatarById(id: string): Promise<{ avatar: string | null } | null> {
    return (await db.prepare("SELECT avatar FROM users WHERE id = ?").get(id)) as {
      avatar: string | null;
    } | null;
  },

  async findEmailTakenByOther(email: string, excludeId: string): Promise<{ id: string } | null> {
    return (await db
      .prepare("SELECT id FROM users WHERE email = ? AND id != ?")
      .get(email, excludeId)) as { id: string } | null;
  },

  async updateProfile(input: UserUpdatePayload): Promise<void> {
    await db
      .prepare(
        `UPDATE users
         SET name = ?, nickname = ?, email = ?, phone = ?, pix_key = ?, birth_date = ?, avatar = ?, reentry_mode = ?,
             bank_name = ?, bank_agency = ?, bank_account = ?, bank_account_type = ?
         WHERE id = ?`
      )
      .run(
        input.name,
        input.nickname,
        input.email,
        input.phone,
        input.pixKey,
        input.birthDate,
        input.avatar,
        input.reentryMode || "AUTO",
        input.bankName,
        input.bankAgency,
        input.bankAccount,
        input.bankAccountType,
        input.id
      );
  },

  async findAfterUpdateById(id: string): Promise<UserProfileAfterUpdate | null> {
    return (await db.prepare(USER_UPDATE_SELECT).get(id)) as UserProfileAfterUpdate | null;
  },

  async findReferralsByReferrerId(referrerId: string): Promise<ReferralListItem[]> {
    const rows = (await db
      .prepare(
        `SELECT id, name, nickname, email, status, avatar, created_at as createdAt
         FROM users
         WHERE referrer_id = ?
         ORDER BY created_at DESC`
      )
      .all(referrerId)) as ReferralListItem[];
    return Array.from(new Map(rows.map((r) => [r.id, r])).values());
  },

  async findDirectReferralsForNetwork(referrerId: string): Promise<NetworkReferralRow[]> {
    return (await db
      .prepare(
        `SELECT id, name, nickname, status, avatar, referrals_count as referralsCount, created_at as createdAt
         FROM users
         WHERE referrer_id = ?`
      )
      .all(referrerId)) as NetworkReferralRow[];
  },

  async findLicenseActivationState(
    userId: string
  ): Promise<{ is_activated: number; referrer_id: string | null } | null> {
    return (await db.prepare("SELECT is_activated, referrer_id FROM users WHERE id = ?").get(
      userId
    )) as { is_activated: number; referrer_id: string | null } | null;
  },

  async findForLicenseCheckout(userId: string): Promise<{
    id: string;
    email: string | null;
    name: string | null;
    isActivated: number;
  } | null> {
    return (await db
      .prepare(
        "SELECT id, email, name, is_activated as isActivated FROM users WHERE id = ?"
      )
      .get(userId)) as {
      id: string;
      email: string | null;
      name: string | null;
      isActivated: number;
    } | null;
  },

  async setLicenseActivated(userId: string): Promise<void> {
    await db.prepare("UPDATE users SET is_activated = 1 WHERE id = ?").run(userId);
  },

  async getCashbackBalance(
    userId: string,
    column: CashbackBalanceColumn
  ): Promise<number | null> {
    const row = (await db
      .prepare(`SELECT ${column} as balance FROM users WHERE id = ?`)
      .get(userId)) as { balance: number } | null;
    return row?.balance ?? null;
  },

  async deductCashback(userId: string, column: CashbackBalanceColumn, amount: number): Promise<void> {
    await db
      .prepare(`UPDATE users SET ${column} = ${column} - ? WHERE id = ?`)
      .run(amount, userId);
  },

  async findVoucherSenderProfile(userId: string): Promise<{
    name: string;
    email: string | null;
    nickname: string | null;
    referral_code: string | null;
  } | null> {
    return (await db
      .prepare("SELECT name, email, nickname, referral_code FROM users WHERE id = ?")
      .get(userId)) as {
      name: string;
      email: string | null;
      nickname: string | null;
      referral_code: string | null;
    } | null;
  },

  async findDirectReferral(
    recipientId: string,
    referrerId: string
  ): Promise<{ id: string; name: string } | null> {
    return (await db
      .prepare("SELECT id, name FROM users WHERE id = ? AND referrer_id = ?")
      .get(recipientId, referrerId)) as { id: string; name: string } | null;
  },

  async findByEmailWithReferrer(
    email: string
  ): Promise<{ id: string; referrer_id: string | null } | null> {
    return (await db
      .prepare("SELECT id, referrer_id FROM users WHERE email = ?")
      .get(email)) as { id: string; referrer_id: string | null } | null;
  },

  async findByPhoneWithReferrer(
    phone: string
  ): Promise<{ id: string; referrer_id: string | null } | null> {
    return (await db
      .prepare("SELECT id, referrer_id FROM users WHERE phone = ?")
      .get(phone)) as { id: string; referrer_id: string | null } | null;
  },

  async findReferralsCount(userId: string): Promise<{ referrals_count: number } | null> {
    return (await db
      .prepare("SELECT referrals_count FROM users WHERE id = ?")
      .get(userId)) as { referrals_count: number } | null;
  },

  async updateDocumentStatus(userId: string, status: "VALIDATED" | "REJECTED"): Promise<void> {
    await db.prepare("UPDATE users SET document_status = ? WHERE id = ?").run(status, userId);
  },

  async findProgressStats(userId: string): Promise<{
    referrals_count: number;
    career_level: string;
    cycle_sales_count: number;
  } | null> {
    return (await db
      .prepare(
        "SELECT referrals_count, career_level, cycle_sales_count FROM users WHERE id = ?"
      )
      .get(userId)) as {
      referrals_count: number;
      career_level: string;
      cycle_sales_count: number;
    } | null;
  },

  async promoteToBronzeIfPartner(userId: string): Promise<void> {
    await db
      .prepare("UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'")
      .run(userId);
  },

  createUserId(): string {
    return generateId("user");
  },
};
