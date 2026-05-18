import { db } from "../config/db.ts";

export const pushSubscriptionRepository = {
  async upsert(userId: string, subscription: unknown): Promise<void> {
    await db
      .prepare("REPLACE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)")
      .run(userId, JSON.stringify(subscription));
  },
};
