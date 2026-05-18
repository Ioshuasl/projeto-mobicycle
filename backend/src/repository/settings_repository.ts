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

  async getValue(key: string): Promise<string | null> {
    const row = (await db
      .prepare("SELECT value FROM settings WHERE `key` = ?")
      .get(key)) as { value: string } | null;
    return row?.value ?? null;
  },

  async findAllAsRecord(): Promise<Record<string, string>> {
    const rows = (await db.prepare("SELECT * FROM settings").all()) as Array<{
      key: string;
      value: string;
    }>;
    return rows.reduce<Record<string, string>>((acc, curr) => {
      acc[curr.key] = curr.value;
      return acc;
    }, {});
  },

  async setValue(key: string, value: string): Promise<void> {
    await ensureSetting(key, value);
  },
};
