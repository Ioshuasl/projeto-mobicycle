import { db, hashPassword } from "../config/db.ts";
import logger from "../utils/logger.ts";
import { MatrixManager } from "./matrix_manager.ts";

export class UserManager {
  static ensureSystemUsers() {
    // No longer creating ghost users
  }

  static async resetSystem(): Promise<{ success: true } | { success: false; error: string }> {
    try {
      logger.info("Performing TOTAL system reset...");
      const startTime = Date.now();

      await db.exec("SET FOREIGN_KEY_CHECKS = 0");
      try {
        const tables = [
          "matrix_positions",
          "matrix_history",
          "matrix_cycles",
          "user_badges",
          "badges",
          "transactions",
          "notifications",
          "documents",
          "vouchers",
          "push_subscriptions",
          "matrices",
          "users",
        ];

        for (const table of tables) {
          await db.prepare(`DELETE FROM ${table}`).run();
        }

        const defaultSettings: [string, string][] = [
          [
            "banner_url",
            "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop",
          ],
          [
            "logo_url",
            "https://storage.googleapis.com/ais-studio-user-uploads/67ea9a5c-6b3a-4e8a-8e2a-7f1a8e2a7f1a/image.png",
          ],
          ["flow_economy", "0"],
          ["matrix_adhesion_fee", "650"],
          ["matrix_onboard_bonus", "100"],
          ["matrix_cashboard_bonus", "3990"],
          ["matrix_referral_bonus", "100"],
          ["matrix_min_referrals_to_cycle", "2"],
          ["cashback_percent_referral", "10"],
          ["cashback_percent_infinite", "10"],
          ["cashback_percent_unilevel", "10"],
          ["cashback_percent_snack", "5"],
          ["cashback_percent_energy", "5"],
          ["cashback_percent_guincho", "5"],
          ["cashback_percent_hability_test", "5"],
          ["bonus_percent_executivo_1", "5"],
          ["bonus_percent_executivo_2", "10"],
          ["bonus_percent_executivo_3", "15"],
          ["bonus_percent_executivo_4", "20"],
          ["bonus_percent_diamante", "25"],
          ["bonus_percent_black_diamante", "30"],
          ["bonus_percent_vice_presidente", "35"],
          ["bonus_percent_presidente", "40"],
          ["bonus_percent_ceo_ple", "45"],
          ["matrix_formation_rule", "FILL_BASE"],
          ["bonus_unilevel_l1", "10"],
          ["bonus_unilevel_l2", "5"],
          ["bonus_unilevel_l3", "3"],
          ["bonus_unilevel_l4", "2"],
          ["bonus_unilevel_l5", "1"],
          ["bonus_unilevel_l6", "1"],
          ["bonus_unilevel_l7", "1"],
          ["bonus_unilevel_l8", "1"],
          ["theme_neon_green", "#39ff14"],
          ["theme_neon_blue", "#00f3ff"],
          ["theme_neon_purple", "#bc13fe"],
          ["theme_neon_orange", "#ff6700"],
          ["theme_neon_pink", "#ff00ff"],
          ["image_cache_version", "1"],
          ["service_guincho_urbano_price", "180"],
          ["service_guincho_interurbano_price", "450"],
          ["service_assistencia_mensal_price", "85"],
          ["service_corridas_curta_price", "15"],
          ["service_corridas_media_price", "35"],
          ["service_corridas_longa_price", "75"],
          ["service_snack_rapido_price", "25"],
          ["service_snack_completa_price", "55"],
          ["service_snack_familia_price", "120"],
          ["service_energy_drink_price", "12"],
          ["service_energy_kit_price", "150"],
          ["service_energy_plano_price", "290"],
          ["service_bonus_hability_test_price_1", "100"],
          ["service_bonus_hability_test_price_2", "250"],
          ["service_bonus_hability_test_price_3", "500"],
          ["service_corridas_enabled", "1"],
          ["service_snack_enabled", "1"],
          ["service_energy_enabled", "1"],
          ["service_guincho_enabled", "1"],
          ["service_bonus_hability_test_enabled", "1"],
          ["service_fee_percent_corridas", "10"],
          ["service_fee_percent_energy", "3"],
          ["service_fee_percent_snack", "1.5"],
          ["service_fee_percent_guincho", "0.6"],
          ["service_fee_percent_hability", "0.15"],
          ["matrix_explosion_count", "0"],
        ];

        for (const [key, value] of defaultSettings) {
          await db.prepare("INSERT IGNORE INTO settings (`key`, value) VALUES (?, ?)").run(key, value);
        }

        const adminPassword = await hashPassword("admin");
        await db
          .prepare(
            `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, career_level, is_activated, document_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            "sys_admin_001",
            "Admin Master",
            "Master",
            "consultorcredenciado@gmail.com",
            adminPassword,
            "000.000.000-00",
            "00000000000",
            "MASTER",
            "admin",
            "ADMIN001",
            "LICENSED",
            1,
            "APPROVED"
          );

        await db
          .prepare(
            `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, career_level, is_activated, document_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            "sys_admin_002",
            "Admin Mobicyclo",
            "Admin",
            "admin@mobicyclo.com",
            await hashPassword("admin"),
            "111.111.111-11",
            "11111111111",
            "MASTER",
            "admin",
            "MOBI001",
            "LICENSED",
            1,
            "APPROVED"
          );

        await db
          .prepare(
            `INSERT INTO users (id, name, nickname, email, password, cpf, phone, status, role, referral_code, career_level, is_activated, document_status)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
          )
          .run(
            "sys_explosion",
            "Mobicyclo Explosion",
            "Explosion",
            "explosion@mobicyclo.com",
            await hashPassword("explosion"),
            "222.222.222-22",
            "22222222222",
            "MASTER",
            "admin",
            "EXPLOSION001",
            "LICENSED",
            1,
            "APPROVED"
          );

        await MatrixManager.seedInitialMatrices();
      } finally {
        await db.exec("SET FOREIGN_KEY_CHECKS = 1");
      }

      logger.info(`TOTAL system reset completed in ${Date.now() - startTime}ms`);
      return { success: true };
    } catch (err) {
      logger.error("Error in resetSystem:", err);
      return {
        success: false,
        error: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
