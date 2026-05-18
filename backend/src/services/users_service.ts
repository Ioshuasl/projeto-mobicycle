import { HttpError } from "../interfaces/errors.ts";
import type { SessionProfile } from "../interfaces/user.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { userRepository } from "../repository/user_repository.ts";

export type AvatarPayload =
  | { kind: "buffer"; contentType: string; buffer: Buffer }
  | { kind: "redirect"; url: string };

export const usersService = {
  async getById(requester: AuthUser, targetId: string): Promise<SessionProfile> {
    if (requester.id !== targetId && !isUserAdmin(requester)) {
      throw new HttpError(403, "Acesso negado");
    }

    const user = await userRepository.findSessionProfileById(targetId);
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    return user;
  },

  async resolveAvatar(userId: string): Promise<AvatarPayload | null> {
    const row = await userRepository.findAvatarById(userId);
    if (!row?.avatar) {
      return null;
    }

    const match = row.avatar.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
    if (match) {
      return {
        kind: "buffer",
        contentType: `image/${match[1]}`,
        buffer: Buffer.from(match[2], "base64"),
      };
    }

    return { kind: "redirect", url: row.avatar };
  },
};
