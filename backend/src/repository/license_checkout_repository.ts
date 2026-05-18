import { db, generateId } from "../config/db.ts";

export type LicenseCheckoutRow = {
  id: string;
  user_id: string;
  amount: number;
  status: string;
};

export const licenseCheckoutRepository = {
  createId(): string {
    return generateId("lc");
  },

  async insertPending(input: {
    id: string;
    userId: string;
    externalReference: string;
    preferenceId: string;
    amount: number;
  }): Promise<void> {
    await db
      .prepare(
        `INSERT INTO license_checkouts (
          id, user_id, external_reference, preference_id, amount, currency_id, status
        ) VALUES (?, ?, ?, ?, ?, 'BRL', 'PENDING')`
      )
      .run(
        input.id,
        input.userId,
        input.externalReference,
        input.preferenceId,
        input.amount
      );
  },

  async findByExternalReference(externalReference: string): Promise<LicenseCheckoutRow | null> {
    return (await db
      .prepare("SELECT * FROM license_checkouts WHERE external_reference = ?")
      .get(externalReference)) as LicenseCheckoutRow | null;
  },

  async updatePaymentMeta(
    checkoutId: string,
    mpPaymentId: string,
    mpPaymentStatus: string
  ): Promise<void> {
    await db
      .prepare(
        "UPDATE license_checkouts SET mp_payment_id = ?, mp_payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
      )
      .run(mpPaymentId, mpPaymentStatus, checkoutId);
  },

  async markActivated(checkoutId: string): Promise<void> {
    await db
      .prepare(
        `UPDATE license_checkouts SET
          status = 'ACTIVATED',
          activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`
      )
      .run(checkoutId);
  },
};
