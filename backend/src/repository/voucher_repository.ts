import { db } from "../config/db.ts";

export type PendingVoucherRow = {
  id: string;
  amount: number;
};

export const voucherRepository = {
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
