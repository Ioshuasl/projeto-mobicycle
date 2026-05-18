import { db } from "../config/db.ts";
import { settingsRepository } from "./settings_repository.ts";

export type AdminDashboardStats = {
  totalUsers: number;
  activeUsers: number;
  totalBalance: number;
  totalCashback: number;
  totalSnackCashback: number;
  totalEnergyCashback: number;
  totalGuinchoCashback: number;
  totalHabilityCashback: number;
  totalTransactions: number;
  activeMatrices: number;
  onBoardMatrices: number;
  cashBoardMatrices: number;
  cycles: number;
  flowEconomy: number;
  totalRevenue: number;
  totalBonusPaid: number;
  totalTaxes: number;
  growthData: Array<{ date: string; count: number }>;
  revenueHistory: Array<{ date: string; amount: number }>;
};

async function scalarCount(query: string, ...params: unknown[]): Promise<number> {
  const row = (await db.prepare(query).get(...params)) as { count: number };
  return row.count;
}

async function scalarSum(query: string, ...params: unknown[]): Promise<number> {
  const row = (await db.prepare(query).get(...params)) as { sum: number | null };
  return row.sum ?? 0;
}

export const adminStatsRepository = {
  async getDashboardStats(): Promise<AdminDashboardStats> {
    const totalUsers = await scalarCount("SELECT COUNT(*) as count FROM users");
    const totalBalance = await scalarSum("SELECT SUM(balance) as sum FROM users");
    const totalCashback = await scalarSum("SELECT SUM(cashback_balance) as sum FROM users");
    const totalTransactions = await scalarCount("SELECT COUNT(*) as count FROM transactions");
    const activeMatrices = await scalarCount(
      "SELECT COUNT(*) as count FROM matrices WHERE status = 'OPEN'"
    );
    const onBoardMatrices = await scalarCount(
      "SELECT COUNT(*) as count FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN'"
    );
    const cashBoardMatrices = await scalarCount(
      "SELECT COUNT(*) as count FROM matrices WHERE type = 'CASHBOARD' AND status = 'OPEN'"
    );
    const cycles = await scalarCount(
      "SELECT COUNT(*) as count FROM transactions WHERE type IN ('BONUS', 'CASHBACK') AND description LIKE '%Ciclo%'"
    );

    const flowEconomyRaw = await settingsRepository.getValue("flow_economy");
    const flowEconomy = parseFloat(flowEconomyRaw ?? "0");

    const totalRevenue = await scalarSum(
      "SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED'"
    );
    const totalBonusPaid = await scalarSum(
      "SELECT SUM(amount) as sum FROM transactions WHERE type = 'BONUS' AND status = 'COMPLETED'"
    );
    const totalTaxes = totalRevenue * 0.075;

    const totalSnackCashback = await scalarSum(
      "SELECT SUM(snack_fast_cashback) as sum FROM users"
    );
    const totalEnergyCashback = await scalarSum(
      "SELECT SUM(energy_cashback) as sum FROM users"
    );
    const totalGuinchoCashback = await scalarSum(
      "SELECT SUM(guincho_cashback) as sum FROM users"
    );
    const totalHabilityCashback = await scalarSum(
      "SELECT SUM(hability_test_cashback) as sum FROM users"
    );

    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    const activeUsers = await scalarCount(
      "SELECT COUNT(DISTINCT user_id) as count FROM transactions WHERE created_at > ?",
      thirtyDaysAgo
    );

    const growthData: Array<{ date: string; count: number }> = [];
    const revenueHistory: Array<{ date: string; amount: number }> = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
      const count = await scalarCount(
        "SELECT COUNT(*) as count FROM users WHERE created_at LIKE ?",
        `${date}%`
      );
      growthData.push({ date, count });

      const amount = await scalarSum(
        "SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED' AND created_at LIKE ?",
        `${date}%`
      );
      revenueHistory.push({ date, amount });
    }

    return {
      totalUsers,
      activeUsers,
      totalBalance,
      totalCashback,
      totalSnackCashback,
      totalEnergyCashback,
      totalGuinchoCashback,
      totalHabilityCashback,
      totalTransactions,
      activeMatrices,
      onBoardMatrices,
      cashBoardMatrices,
      cycles,
      flowEconomy,
      totalRevenue,
      totalBonusPaid,
      totalTaxes,
      growthData,
      revenueHistory,
    };
  },
};
