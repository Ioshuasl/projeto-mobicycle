import { hashPassword } from "../config/db.ts";
import { HttpError } from "../interfaces/errors.ts";
import type { NetworkNode, UserProfileAfterUpdate, UserUpdatePayload } from "../interfaces/user.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { matrixRepository } from "../repository/matrix_repository.ts";
import { userRepository } from "../repository/user_repository.ts";

const MAX_NETWORK_DEPTH = 15;
const DEFAULT_NETWORK_DEPTH = 10;

export const userService = {
  async update(requester: AuthUser, input: UserUpdatePayload): Promise<UserProfileAfterUpdate> {
    if (requester.id !== input.id && !isUserAdmin(requester)) {
      throw new HttpError(403, "Acesso negado");
    }

    const existingEmail = await userRepository.findEmailTakenByOther(input.email, input.id);
    if (existingEmail) {
      throw new HttpError(400, "Este e-mail já está sendo usado por outra conta.");
    }

    await userRepository.updateProfile(input);

    if (input.password) {
      const hashedPassword = await hashPassword(input.password);
      await userRepository.updatePassword(input.id, hashedPassword);
    }

    const user = await userRepository.findAfterUpdateById(input.id);
    if (!user) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    return user;
  },

  async getReferrals(userId: string) {
    return userRepository.findReferralsByReferrerId(userId);
  },

  async getNetwork(userId: string, depthParam?: string): Promise<NetworkNode[] | null> {
    const maxDepth = Math.min(parseInt(depthParam ?? "", 10) || DEFAULT_NETWORK_DEPTH, MAX_NETWORK_DEPTH);
    return buildNetworkTree(userId, maxDepth, 0);
  },
};

async function buildNetworkTree(
  userId: string,
  maxDepth: number,
  depth: number
): Promise<NetworkNode[] | null> {
  if (depth >= maxDepth) {
    return null;
  }

  const directReferrals = await userRepository.findDirectReferralsForNetwork(userId);
  const results: NetworkNode[] = [];

  for (const ref of directReferrals) {
    const matrixPos = await matrixRepository.findOpenPositionForUser(ref.id);
    results.push({
      ...ref,
      matrixType: matrixPos?.type ?? null,
      matrixPosition: matrixPos?.position ?? null,
      children: await buildNetworkTree(ref.id, maxDepth, depth + 1),
    });
  }

  return results;
}
