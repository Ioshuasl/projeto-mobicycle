import { db, generateId } from "../config/db.ts";

export type PendingVoucherRow = {
  id: string;
  amount: number;
};

export type VoucherListItem = {
  id: string;
  code: string;
  amount: number;
  ownerId: string;
  recipientId: string | null;
  recipientEmail: string | null;
  recipientPhone: string | null;
  status: string;
  createdAt: string;
};

export type OwnedVoucherRow = {
  id: string;
  amount: number;
};

export type VoucherSenderProfile = {
  name: string;
  email: string | null;
  nickname: string | null;
  referral_code: string | null;
};

export const voucherRepository = {
  async findForUser(userId: string): Promise<VoucherListItem[]> {
    return (await db
      .prepare(
        `SELECT id, code, amount, owner_id as ownerId, recipient_id as recipientId,
         recipient_email as recipientEmail, recipient_phone as recipientPhone,
         status, created_at as createdAt FROM vouchers
         WHERE owner_id = ? OR recipient_id = ? ORDER BY created_at DESC`
      )
      .all(userId, userId)) as VoucherListItem[];
  },

  async findOwnedAvailableOrSent(
    voucherId: string,
    ownerId: string
  ): Promise<OwnedVoucherRow | null> {
    return (await db
      .prepare(
        "SELECT id, amount FROM vouchers WHERE id = ? AND owner_id = ? AND (status = 'AVAILABLE' OR status = 'SENT')"
      )
      .get(voucherId, ownerId)) as OwnedVoucherRow | null;
  },

  async insertAvailable(
    voucherId: string,
    code: string,
    amount: number,
    ownerId: string
  ): Promise<void> {
    await db
      .prepare(
        "INSERT INTO vouchers (id, code, amount, owner_id, status) VALUES (?, ?, ?, ?, 'AVAILABLE')"
      )
      .run(voucherId, code, amount, ownerId);
  },

  async transferToUser(voucherId: string, userId: string): Promise<void> {
    await db
      .prepare(
        "UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?"
      )
      .run(userId, userId, voucherId);
  },

  async markSentToEmail(voucherId: string, email: string): Promise<void> {
    await db
      .prepare("UPDATE vouchers SET status = 'SENT', recipient_email = ? WHERE id = ?")
      .run(email, voucherId);
  },

  async markSentToPhone(voucherId: string, phone: string): Promise<void> {
    await db
      .prepare("UPDATE vouchers SET status = 'SENT', recipient_phone = ? WHERE id = ?")
      .run(phone, voucherId);
  },

  createVoucherId(): string {
    return generateId("vch");
  },

  createVoucherCode(): string {
    return generateId("code").toUpperCase();
  },

  async findPendingByEmailOrPhone(
    email: string,
    phone: string
  ): Promise<PendingVoucherRow[]> {
    return (await db
      .prepare(
        "SELECT id, amount FROM vouchers WHERE (recipient_email = ? OR recipient_phone = ?) AND status = 'SENT'"
      )
      .all(email, phone)) as PendingVoucherRow[];
  },

  async assignToUser(voucherId: string, userId: string): Promise<void> {
    await db
      .prepare(
        `UPDATE vouchers SET owner_id = ?, recipient_id = ?, recipient_email = NULL, recipient_phone = NULL
         WHERE id = ?`
      )
      .run(userId, userId, voucherId);
  },
};
