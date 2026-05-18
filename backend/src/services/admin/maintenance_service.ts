import { UserManager } from "../user_manager.ts";
import { maintenanceRepository } from "../../repository/maintenance_repository.ts";

export type MaintenanceResetResult =
  | { success: true }
  | { success: false; error: string };

export const adminMaintenanceService = {
  async resetSystem(): Promise<MaintenanceResetResult> {
    return UserManager.resetSystem();
  },

  async clearGhosts(): Promise<void> {
    await maintenanceRepository.clearGhostEntries();
  },
};
