import { HttpError } from "../interfaces/errors.ts";
import type { SessionProfile } from "../interfaces/user.ts";
import type { AuthUser } from "../middlewares/auth.middleware.ts";
import { isUserAdmin } from "../middlewares/admin.middleware.ts";
import { documentRepository } from "../repository/document_repository.ts";
import { matrixRepository } from "../repository/matrix_repository.ts";
import { notificationRepository } from "../repository/notification_repository.ts";
import { settingsRepository } from "../repository/settings_repository.ts";
import { transactionRepository } from "../repository/transaction_repository.ts";
import { userRepository } from "../repository/user_repository.ts";

const DEFAULT_BANNER_URL =
  "https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop";

function getSettingVal(settings: Map<string, string>, key: string, defaultVal: string): string {
  return settings.get(key) || defaultVal;
}

function buildMatrixSettings(settings: Map<string, string>) {
  const g = (key: string, defaultVal: string) => getSettingVal(settings, key, defaultVal);
  return {
    adhesionFee: parseFloat(g("matrix_adhesion_fee", "650")),
    onboardBonus: parseFloat(g("matrix_onboard_bonus", "100")),
    cashboardBonus: parseFloat(g("matrix_cashboard_bonus", "3990")),
    referralBonus: parseFloat(g("matrix_referral_bonus", "100")),
    minReferralsToCycle: parseInt(g("matrix_min_referrals_to_cycle", "2"), 10),
    flowEconomy: parseFloat(g("flow_economy", "0")),
    themeNeonGreen: g("theme_neon_green", "#39ff14"),
    themeNeonBlue: g("theme_neon_blue", "#00f3ff"),
    themeNeonPurple: g("theme_neon_purple", "#bc13fe"),
    themeNeonOrange: g("theme_neon_orange", "#ff6700"),
    themeNeonPink: g("theme_neon_pink", "#ff00ff"),
    service_corridas_visible: g("service_corridas_visible", "true"),
    service_corridas_enabled: g("service_corridas_enabled", "true"),
    service_snack_visible: g("service_snack_visible", "true"),
    service_snack_enabled: g("service_snack_enabled", "true"),
    service_energy_visible: g("service_energy_visible", "true"),
    service_energy_enabled: g("service_energy_enabled", "true"),
    service_guincho_visible: g("service_guincho_visible", "true"),
    service_guincho_enabled: g("service_guincho_enabled", "true"),
    service_bonus_hability_test_visible: g("service_bonus_hability_test_visible", "true"),
    service_bonus_hability_test_enabled: g("service_bonus_hability_test_enabled", "true"),
    service_guincho_urbano_price: g("service_guincho_urbano_price", "180"),
    service_guincho_interurbano_price: g("service_guincho_interurbano_price", "450"),
    service_assistencia_mensal_price: g("service_assistencia_mensal_price", "85"),
    service_corridas_curta_price: g("service_corridas_curta_price", "15"),
    service_corridas_media_price: g("service_corridas_media_price", "35"),
    service_corridas_longa_price: g("service_corridas_longa_price", "75"),
    service_snack_rapido_price: g("service_snack_rapido_price", "25"),
    service_snack_completa_price: g("service_snack_completa_price", "55"),
    service_snack_familia_price: g("service_snack_familia_price", "120"),
    service_energy_drink_price: g("service_energy_drink_price", "12"),
    service_energy_kit_price: g("service_energy_kit_price", "150"),
    service_energy_plano_price: g("service_energy_plano_price", "290"),
    service_bonus_hability_test_price_1: g("service_bonus_hability_test_price_1", "100"),
    service_bonus_hability_test_price_2: g("service_bonus_hability_test_price_2", "250"),
    service_bonus_hability_test_price_3: g("service_bonus_hability_test_price_3", "500"),
  };
}

export type InitPayload = {
  user: SessionProfile;
  matrices: Record<string, unknown>[];
  notifications: unknown[];
  transactions: unknown[];
  banner: { url: string };
  logo: { url: string };
  history: unknown[];
  documents: unknown[];
  matrixSettings: ReturnType<typeof buildMatrixSettings>;
};

export const sessionService = {
  async getMe(userId: string): Promise<SessionProfile> {
    const user = await userRepository.findSessionProfileById(userId);
    if (!user) {
      throw new HttpError(401, "Não autenticado");
    }
    console.log("[debug:license][/api/me]", {
      userId: user.id,
      isActivated: user.isActivated,
    });
    return user;
  },

  async getInit(authUser: AuthUser): Promise<InitPayload> {
    const user = await userRepository.findSessionProfileById(authUser.id);
    if (!user) {
      throw new HttpError(401, "Não autenticado");
    }

    const adminView = isUserAdmin(authUser);

    let matricesWithPositions: Record<string, unknown>[] = [];
    try {
      matricesWithPositions = await matrixRepository.findOpenOnbordWithPositionsForInit(
        adminView,
        authUser.id
      );
    } catch (matrixErr) {
      console.error("Error fetching matrices in /api/init:", matrixErr);
      matricesWithPositions = [];
    }

    const [notifications, transactions, history, documents, settingsMap] = await Promise.all([
      notificationRepository.findByUserId(authUser.id),
      transactionRepository.findByUserId(authUser.id),
      matrixRepository.findClosedMatricesForUser(authUser.id),
      documentRepository.findByUserId(authUser.id),
      settingsRepository.findAllAsMap(),
    ]);

    const bannerUrl = getSettingVal(settingsMap, "banner_url", DEFAULT_BANNER_URL);
    const logoUrl = getSettingVal(settingsMap, "logo_url", "");

    return {
      user,
      matrices: matricesWithPositions,
      notifications,
      transactions,
      banner: { url: bannerUrl },
      logo: { url: logoUrl },
      history,
      documents,
      matrixSettings: buildMatrixSettings(settingsMap),
    };
  },
};
