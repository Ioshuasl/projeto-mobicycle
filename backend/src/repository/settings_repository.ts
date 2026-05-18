import { db, ensureSetting, getSetting } from "../config/db.ts";

export type ResetTokenPayload = {
  userId: string;
  expiresAt: string;
};

export const settingsRepository = {
  async saveResetToken(token: string, payload: ResetTokenPayload): Promise<void> {
    await ensureSetting(`reset_token_${token}`, JSON.stringify(payload));
  },

  async getResetToken(token: string): Promise<ResetTokenPayload | null> {
    const raw = await getSetting(`reset_token_${token}`, "");
    if (!raw) return null;
    return JSON.parse(raw) as ResetTokenPayload;
  },

  async deleteByKey(key: string): Promise<void> {
    await db.prepare("DELETE FROM settings WHERE `key` = ?").run(key);
  },

  async findAllAsMap(): Promise<Map<string, string>> {
    const rows = (await db.prepare("SELECT `key`, value FROM settings").all()) as Array<{
      key: string;
      value: string;
    }>;
    return new Map(rows.map((s) => [s.key, s.value]));
  },
};
