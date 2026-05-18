import { HttpError } from "../interfaces/errors.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import {
  notificationRepository,
  type NotificationListItem,
} from "../repository/notification_repository.ts";

export const notificationService = {
  async listForUser(userId: string): Promise<NotificationListItem[]> {
    return notificationRepository.findListedByUserId(userId);
  },

  async markAsRead(notificationId: string, authUser: AuthUser): Promise<{ success: true }> {
    const notification = await notificationRepository.findOwnerById(notificationId);

    if (!notification || (notification.user_id !== authUser.id && !isUserAdmin(authUser))) {
      throw new HttpError(403, "Acesso negado");
    }

    await notificationRepository.markAsRead(notificationId);
    return { success: true };
  },
};
