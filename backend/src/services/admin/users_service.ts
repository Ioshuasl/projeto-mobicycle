import { HttpError } from "../../interfaces/errors.ts";
import {
  isAdminEditableUserField,
  type AdminNetworkNode,
  type AdminUserListQuery,
} from "../../interfaces/admin/users.ts";
import type { AuthUser } from "../../middlewares/auth.middleware.ts";
import { adminStatsRepository } from "../../repository/admin_stats_repository.ts";
import { matrixRepository } from "../../repository/matrix_repository.ts";
import { userRepository } from "../../repository/user_repository.ts";
import logger from "../../utils/logger.ts";

const ADMIN_EMAIL_PROTECTED = "consultorcredenciado@gmail.com";
const MAX_ADMIN_NETWORK_DEPTH = 15;
const DEFAULT_ADMIN_NETWORK_DEPTH = 10;

export const adminUsersService = {
  async listUsers(query: AdminUserListQuery) {
    const page = parseInt(query.page ?? "", 10) || 1;
    const limit = parseInt(query.limit ?? "", 10) || 20;
    const search = query.search ?? "";
    const offset = (page - 1) * limit;

    const [users, total] = await Promise.all([
      userRepository.findPaginatedForAdmin(search, limit, offset),
      userRepository.countForAdmin(search),
    ]);

    return { users, total, page, limit };
  },

  async updateStatus(userId: string, status: string | undefined): Promise<void> {
    await userRepository.updateStatus(userId, status ?? "");
  },

  async updateField(
    adminUser: AuthUser,
    userId: string,
    field: string | undefined,
    value: unknown
  ): Promise<void> {
    if (!field || !isAdminEditableUserField(field)) {
      throw new HttpError(400, "Campo não permitido para edição");
    }

    await userRepository.updateAdminField(userId, field, value);
    logger.info(
      `[Admin] Usuário ${userId} atualizado por ${adminUser.id}: ${field} -> ${value}`
    );
  },

  async deleteUser(adminUser: AuthUser, rawId: string | undefined): Promise<void> {
    const id = rawId?.trim();
    if (!id) {
      throw new HttpError(400, "ID obrigatório");
    }
    if (id === adminUser.id) {
      throw new HttpError(400, "Não é possível excluir o próprio usuário logado.");
    }

    const target = await userRepository.findForAdminDelete(id);
    if (!target) {
      throw new HttpError(404, "Usuário não encontrado");
    }

    const email = (target.email || "").toLowerCase();
    if (target.role === "admin" || email === ADMIN_EMAIL_PROTECTED) {
      throw new HttpError(403, "Não é permitido excluir conta de administrador.");
    }
    if (id.startsWith("sys_")) {
      throw new HttpError(403, "Não é permitido excluir usuários de sistema.");
    }

    await userRepository.deleteUserAndRelations(id);
    logger.info(`[Admin] Usuário ${id} excluído por ${adminUser.id}`);
  },

  getStats() {
    return adminStatsRepository.getDashboardStats();
  },

  async getUserNetwork(userId: string, depthParam?: string): Promise<AdminNetworkNode[]> {
    const maxDepth = Math.min(
      parseInt(depthParam ?? "", 10) || DEFAULT_ADMIN_NETWORK_DEPTH,
      MAX_ADMIN_NETWORK_DEPTH
    );
    return buildAdminNetworkTree(userId, maxDepth, 0);
  },
};

async function buildAdminNetworkTree(
  userId: string,
  maxDepth: number,
  depth: number
): Promise<AdminNetworkNode[]> {
  if (depth >= maxDepth) {
    return [];
  }

  const directReferrals = await userRepository.findAdminNetworkReferrals(userId);
  const results: AdminNetworkNode[] = [];

  for (const ref of directReferrals) {
    const refId = ref.id as string;
    const matrixPos = await matrixRepository.findOpenPositionForUser(refId);
    results.push({
      ...ref,
      id: refId,
      matrixType: matrixPos?.type ?? null,
      matrixPosition: matrixPos?.position ?? null,
      children: await buildAdminNetworkTree(refId, maxDepth, depth + 1),
    });
  }

  return results;
}
