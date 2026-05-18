import { HttpError } from "../interfaces/errors.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { pushSubscriptionRepository } from "../repository/push_subscription_repository.ts";
import { settingsRepository } from "../repository/settings_repository.ts";

export const pushService = {
  async getVapidPublicKey(): Promise<{ publicKey: string }> {
    const raw = await settingsRepository.getValue("vapid_keys");
    if (!raw) {
      throw new HttpError(500, "Erro interno");
    }
    const keys = JSON.parse(raw) as { publicKey: string };
    return { publicKey: keys.publicKey };
  },

  async subscribe(
    authUser: AuthUser,
    userId: string | undefined,
    subscription: unknown
  ): Promise<{ success: true }> {
    if (!userId || !subscription) {
      throw new HttpError(400, "Dados incompletos");
    }

    if (authUser.id !== userId && !isUserAdmin(authUser)) {
      throw new HttpError(403, "Acesso negado");
    }

    await pushSubscriptionRepository.upsert(userId, subscription);
    return { success: true };
  },
};
