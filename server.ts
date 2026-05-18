import express from "express";
import path from "path";
import crypto from "crypto";
import md5 from "md5";
import { fileURLToPath } from "url";
import { sendNotificationEmail } from "./email.ts";
import { parseStringPromise } from 'xml2js';
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import jwt from "jsonwebtoken";
import { default as RedisStore } from "rate-limit-redis";
import { connectRedis, redisClient } from "./src/server/cache.ts";

import { db, initDatabase, hashPassword, verifyPassword, getSetting, ensureSetting, generateId, withTransaction } from "./src/server/db.ts";
import { NotificationManager, initNotifications } from "./src/server/notificationManager.ts";
import { AchievementManager } from "./src/server/achievementManager.ts";
import { FinancialManager } from "./src/server/financialManager.ts";
import { MatrixManager } from "./src/server/matrixManager.ts";
import { UserManager } from "./src/server/userManager.ts";
import { updateCareerLevel, generateReferralCode } from "./src/server/utils.ts";
import logger, { httpLogger } from "./src/server/logger.ts";
import { errorHandler, catchAsync } from "./src/server/errorHandler.ts";
import { loginSchema, registerSchema } from "./src/server/schemas.ts";
import {
  isMercadoPagoConfigured,
  createCheckoutProPreferenceWithAppPaths,
  extractMerchantOrderIdFromNotification,
  extractPaymentIdFromNotification,
  verifyMercadoPagoWebhookSignatureFromEnv,
  getMercadoPagoPaymentById,
  isMercadoPagoPaymentApproved,
  fetchMercadoPagoMerchantOrderById,
} from "./src/utils/mercadopago/index.ts";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SESE_CNPJ = process.env.SESE_CNPJ || "47.123.456/0001-89";
const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRY = '24h';

// HTML escaping utility to prevent XSS in emails
const escapeHtml = (str: string) => str
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#039;');

const LICENSE_CHECKOUT_PREFIX = "license:";

/** Idempotente: retorna sem efeito se a licença já estiver ativa (reentrega de webhook). */
async function activateUserLicenseAfterGatewayPayment(userId: string, adhesionFee: number): Promise<void> {
  console.log("[debug:license][activateUserLicenseAfterGatewayPayment] entrada", { userId, adhesionFee });
  const user = (await db.prepare("SELECT * FROM users WHERE id = ?").get(userId)) as any;
  if (!user) throw new Error(`Usuário não encontrado: ${userId}`);
  if (user.is_activated) {
    console.log("[debug:license][activateUserLicenseAfterGatewayPayment] usuário já is_activated=1 — noop", {
      userId,
    });
    return;
  }

  await db.prepare("UPDATE users SET is_activated = 1 WHERE id = ?").run(userId);

  await db
    .prepare(
      "INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'ADHESION', 'Ativação de Licença de Uso', 'COMPLETED')"
    )
    .run(generateId("tx"), userId, adhesionFee);

  if (user.referrer_id) {
    await FinancialManager.addReferralBonus(user.referrer_id, userId);
    await FinancialManager.payLicenseUnilevelBonus(userId);
    await FinancialManager.payInfiniteBonus(userId, adhesionFee);
  }

  const openMatrices = (await db
    .prepare("SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC")
    .all()) as any[];
  let targetMatrix = openMatrices.length > 0 ? openMatrices[0] : null;
  if (!targetMatrix) {
    targetMatrix = await MatrixManager.createMatrix("ONBORD");
  }
  await MatrixManager.fillPosition(targetMatrix.id, userId);
  console.log("[debug:license][activateUserLicenseAfterGatewayPayment] concluído", {
    userId,
    matrixId: targetMatrix.id,
  });
}

type MercadoPagoPaymentLike = {
  id?: unknown;
  status?: string;
  external_reference?: string | null;
  currency_id?: string;
  transaction_amount?: number;
};

/**
 * Processa um pagamento MP já carregado: se for checkout de licença (`license:*`), ativa e marca checkout.
 * @returns `activated` se a licença foi ativada nesta execução; `skipped` caso contrário (outro tipo de pagamento, pendente, valor divergente, etc.).
 */
async function tryActivateLicenseFromMercadoPagoPayment(
  payment: MercadoPagoPaymentLike,
  paymentIdFallback: string
): Promise<"activated" | "skipped"> {
  const extRefRaw = payment.external_reference;
  const extRef = typeof extRefRaw === "string" ? extRefRaw.trim() : "";
  if (!extRef || !extRef.startsWith(LICENSE_CHECKOUT_PREFIX)) {
    console.log("[debug:license][/api/webhooks/mercadopago] external_reference não é license:* , ACK", {
      extRef,
      paymentStatus: payment.status,
    });
    return "skipped";
  }

  const checkout = (await db
    .prepare("SELECT * FROM license_checkouts WHERE external_reference = ?")
    .get(extRef)) as {
    id: string;
    user_id: string;
    amount: number;
    status: string;
    external_reference: string;
  } | null;

  if (!checkout) {
    logger.warn(`[MP webhook] license_checkouts não encontrado para external_reference=${extRef}`);
    console.log("[debug:license][/api/webhooks/mercadopago] license_checkouts NÃO encontrado", { extRef });
    return "skipped";
  }
  console.log("[debug:license][routes/index.ts] checkout encontrado", {
    checkoutId: checkout.id,
    userId: checkout.user_id,
    status: checkout.status,
    amount: checkout.amount,
  });
  const mpId = payment.id != null ? String(payment.id) : paymentIdFallback;
  const mpStatus = String(payment.status ?? "");

  await db
    .prepare(
      "UPDATE license_checkouts SET mp_payment_id = ?, mp_payment_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?"
    )
    .run(mpId, mpStatus, checkout.id);

  if (!isMercadoPagoPaymentApproved(payment as Parameters<typeof isMercadoPagoPaymentApproved>[0])) {
    console.log("[debug:license][/api/webhooks/mercadopago] pagamento não approved, ACK", {
      mpStatus: payment.status,
    });
    return "skipped";
  }

  const currency = String((payment as { currency_id?: string }).currency_id || "BRL");
  if (currency !== "BRL") {
    logger.warn(`[MP webhook] moeda inesperada ${currency} para checkout ${checkout.id}`);
    console.log("[debug:license][/api/webhooks/mercadopago] moeda != BRL, ACK", { currency });
    return "skipped";
  }

  const paid = Number((payment as { transaction_amount?: number }).transaction_amount);
  if (!Number.isFinite(paid) || Math.abs(paid - Number(checkout.amount)) > 0.02) {
    logger.warn(
      `[MP webhook] valor divergente para checkout ${checkout.id}: pago=${paid} esperado=${checkout.amount}`
    );
    console.log("[debug:license][/api/webhooks/mercadopago] valor divergente, ACK", { paid, esperado: checkout.amount });
    return "skipped";
  }

  console.log("[debug:license][/api/webhooks/mercadopago] chamando activateUserLicenseAfterGatewayPayment", {
    userId: checkout.user_id,
    amount: checkout.amount,
  });
  await activateUserLicenseAfterGatewayPayment(checkout.user_id, Number(checkout.amount));

  await db
    .prepare(
      `UPDATE license_checkouts SET
        status = 'ACTIVATED',
        activated_at = COALESCE(activated_at, CURRENT_TIMESTAMP),
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`
    )
    .run(checkout.id);

  logger.info(
    `[MP webhook] licença ativada payment=${mpId} user=${checkout.user_id} checkout=${checkout.id}`
  );
  console.log("[debug:license][/api/webhooks/mercadopago] licença ativada + checkout ACTIVATED", {
    mpId,
    userId: checkout.user_id,
    checkoutId: checkout.id,
  });
  return "activated";
}

async function startServer() {
  // Inicializa banco de dados MySQL (aguarda conexão + schema + seeds)
  await initDatabase();
  const redisOk = await connectRedis();
  await initNotifications();
  logger.info(`[System] Services initialized (MySQL + ${redisOk ? 'Redis' : 'Redis skipped (dev, in-memory limits)'})`);

  // Update career levels for all users on startup
  logger.info('[System] Updating career levels...');
  const allUsers = await db.prepare("SELECT id FROM users").all() as any[];
  for (const u of allUsers) {
    await updateCareerLevel(u.id);
  }

  // Ensure all users have a referral code
  const usersWithoutCode = await db.prepare("SELECT id, name FROM users WHERE referral_code IS NULL").all() as any[];
  for (const user of usersWithoutCode) {
    const code = generateReferralCode(user.name || 'USER');
    await db.prepare("UPDATE users SET referral_code = ? WHERE id = ?").run(code, user.id);
  }

  const app = express();
  app.use(express.json());
  app.use(httpLogger); // Log de acessos HTTP (Método, URL, Status, Tempo)

  const PORT = parseInt(process.env.PORT || '3000');

  // Security Headers (S18)
  app.use(helmet({
    contentSecurityPolicy: false, // Managed by Nginx in production
    crossOriginEmbedderPolicy: false,
  }));

  // Rate Limiting (S17) — Redis em produção/cluster; em dev sem Redis usa store em memória (padrão do express-rate-limit).
  const authRedisStore = redisOk
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      })
    : undefined;
  const apiRedisStore = redisOk
    ? new RedisStore({
        sendCommand: (...args: string[]) => redisClient.sendCommand(args),
      })
    : undefined;

  const authLimiter = rateLimit({
    ...(authRedisStore ? { store: authRedisStore } : {}),
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 15, // max 15 login/register attempts per window
    message: { error: "Muitas tentativas. Aguarde 15 minutos antes de tentar novamente." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  const apiLimiter = rateLimit({
    ...(apiRedisStore ? { store: apiRedisStore } : {}),
    windowMs: 60 * 1000, // 1 minute
    max: 120, // 120 requests per minute per IP
    message: { error: "Limite de requisições excedido. Tente novamente em instantes." },
    standardHeaders: true,
    legacyHeaders: false,
  });

  app.use('/api/', apiLimiter);

  // JWT token generation helper
  const generateToken = (userId: string, email: string) => {
    return jwt.sign({ userId, email }, JWT_SECRET, { expiresIn: JWT_EXPIRY });
  };

  // Security Middlewares (S01: JWT-based authentication)
  const authenticateUser = async (req: any, res: any, next: any) => {
    // Try JWT Bearer token first
    const authHeader = req.headers.authorization;
    let userId: string | null = null;

    if (authHeader?.startsWith('Bearer ')) {
      try {
        const decoded = jwt.verify(authHeader.split(' ')[1], JWT_SECRET) as any;
        userId = decoded.userId;
      } catch {
        return res.status(401).json({ error: "Token inválido ou expirado" });
      }
    } else {
      // Fallback to x-user-id for backward compatibility during migration
      userId = req.headers['x-user-id'] as string;
    }

    if (!userId || userId === 'null' || userId === 'undefined') {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    const user = await db.prepare("SELECT id, role, email, status FROM users WHERE id = ?").get(userId) as any;
    if (!user) {
      return res.status(401).json({ error: "Não autenticado" });
    }
    
    req.user = user;
    next();
  };

  const isUserAdmin = (user: any) => {
    if (!user) return false;
    return user.email === 'consultorcredenciado@gmail.com';
  };

  const authorizeAdmin = (req: any, res: any, next: any) => {
    if (!isUserAdmin(req.user)) {
      return res.status(403).json({ error: "Acesso negado. Apenas administradores podem realizar esta ação." });
    }
    next();
  };

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // API Routes
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", env: process.env.NODE_ENV });
  });

  // S02: Secure password reset with crypto token + expiration
  app.post("/api/auth/forgot-password", authLimiter, async (req, res) => {
    try {
      const { email, cpf } = req.body;
      const user = await db.prepare("SELECT id FROM users WHERE email = ? AND cpf = ?").get(email, cpf) as any;
      if (!user) {
        // Return generic message to prevent user enumeration
        return res.json({ success: true, message: "Se os dados estiverem corretos, um token de recuperação será gerado." });
      }
      // Generate a secure reset token
      const resetToken = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString(); // 15 min expiry
      // Store the token in settings (ideally a dedicated table)
      await ensureSetting(`reset_token_${resetToken}`, JSON.stringify({ userId: user.id, expiresAt }));
      res.json({ success: true, resetToken });
    } catch (err) {
      res.status(500).json({ error: "Erro ao processar recuperação" });
    }
  });

  app.post("/api/auth/reset-password", authLimiter, async (req, res) => {
    try {
      const { resetToken, newPassword } = req.body;
      if (!resetToken || !newPassword) {
        return res.status(400).json({ error: "Dados incompletos" });
      }
      if (newPassword.length < 6) {
        return res.status(400).json({ error: "A senha deve ter pelo menos 6 caracteres" });
      }
      
      // Validate the reset token
      const tokenData = await getSetting(`reset_token_${resetToken}`, '');
      if (!tokenData) {
        return res.status(400).json({ error: "Token de recuperação inválido ou expirado" });
      }

      const { userId, expiresAt } = JSON.parse(tokenData);
      if (new Date(expiresAt) < new Date()) {
        // Token expired — clean up
        await db.prepare("DELETE FROM settings WHERE `key` = ?").run(`reset_token_${resetToken}`);
        return res.status(400).json({ error: "Token de recuperação expirado. Solicite um novo." });
      }

      const hashedPassword = await hashPassword(newPassword);
      await db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, userId);
      // Invalidate token after use
      await db.prepare("DELETE FROM settings WHERE `key` = ?").run(`reset_token_${resetToken}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro ao redefinir senha" });
    }
  });

  app.get("/api/users/:id", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      
      if (req.user.id !== id && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const user = await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar, referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(id);
      
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      res.json(user);
    } catch (err) {
      console.error("Error in /api/users/:id:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // S01/S24: Dedicated endpoint to fetch avatar to prevent large payloads in /api/init
  app.get("/api/users/:id/avatar", async (req, res) => {
    try {
      const { id } = req.params;
      const user = await db.prepare("SELECT avatar FROM users WHERE id = ?").get(id) as any;
      
      if (!user || !user.avatar) {
        return res.status(404).send("Not found");
      }

      // If it's a base64 string, we could decode it, but the frontend img tag handles data:image/... base64 natively
      // Returning it as text or redirecting. Actually, let's redirect to data URI so img src works
      // But redirecting to a massive data URI can fail length limits.
      // Better to decode base64 and send binary.
      const match = user.avatar.match(/^data:image\/([a-zA-Z+]+);base64,(.+)$/);
      if (match) {
        const type = match[1];
        const base64Data = match[2];
        const buffer = Buffer.from(base64Data, 'base64');
        res.setHeader('Content-Type', `image/${type}`);
        res.setHeader('Cache-Control', 'public, max-age=3600'); // Cache for 1 hour
        return res.send(buffer);
      } else {
        // Fallback for raw text/urls
        return res.redirect(user.avatar);
      }
    } catch (err) {
      res.status(500).send("Error");
    }
  });

  app.get("/api/me", authenticateUser, async (req: any, res) => {
    try {
      const user = await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar, referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(req.user.id) as any;
      
      if (!user) {
        return res.status(401).json({ error: "Não autenticado" });
      }
      console.log("[debug:license][/api/me]", { userId: user.id, isActivated: user.isActivated });
      res.json(user);
    } catch (err) {
      console.error("Error in /api/me:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/init", authenticateUser, async (req: any, res) => {
    const timestamp = new Date().toISOString();
    try {
      const user = await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar, referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(req.user.id) as any;
      
      if (!user) {
        return res.status(401).json({ error: "Não autenticado" });
      }

      const isAdmin = isUserAdmin(user);
      
      let matricesWithPositions: any[] = [];
      try {
        let matrices;
        if (isAdmin) {
          matrices = await db.prepare("SELECT * FROM matrices WHERE status = 'OPEN' AND type = 'ONBORD'").all();
          
          if (matrices.length > 0) {
            const allPositions = await db.prepare(`
              SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.cycle_sales_count as cycleSalesCount
              FROM matrix_positions mp 
              JOIN users u ON mp.user_id = u.id 
              JOIN matrices m ON mp.matrix_id = m.id
              WHERE m.status = 'OPEN' AND m.type = 'ONBORD'
            `).all();

            const positionsByMatrix = allPositions.reduce((acc: any, p: any) => {
              if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
              acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
              return acc;
            }, {});

            matricesWithPositions = matrices.map((m: any) => ({
              ...m,
              positions: positionsByMatrix[m.id] || []
            }));
          }
        } else {
          matrices = await db.prepare(`
            SELECT DISTINCT m.* 
            FROM matrices m 
            JOIN matrix_positions mp ON m.id = mp.matrix_id 
            WHERE m.status = 'OPEN' AND mp.user_id = ? AND m.type = 'ONBORD'
          `).all(req.user.id);

          if (matrices.length > 0) {
            const allPositions = await db.prepare(`
              SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.cycle_sales_count as cycleSalesCount
              FROM matrix_positions mp 
              JOIN users u ON mp.user_id = u.id 
              WHERE mp.matrix_id IN (
                SELECT matrix_id FROM matrix_positions WHERE user_id = ?
              ) AND mp.matrix_id IN (SELECT id FROM matrices WHERE type = 'ONBORD')
            `).all(req.user.id);

            const positionsByMatrix = allPositions.reduce((acc: any, p: any) => {
              if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
              acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
              return acc;
            }, {});

            matricesWithPositions = matrices.map((m: any) => ({
              ...m,
              positions: positionsByMatrix[m.id] || []
            }));
          }
        }
      } catch (matrixErr) {
        console.error("Error fetching matrices in /api/init:", matrixErr);
        matricesWithPositions = [];
      }

      // Parallelize heavy queries
      const [
        notifications,
        transactionsRaw,
        history,
        documents,
        settingsData
      ] = await Promise.all([
        db.prepare("SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(req.user.id),
        db.prepare("SELECT * FROM transactions WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id),
        db.prepare(`
          SELECT DISTINCT m.* 
          FROM matrices m 
          JOIN matrix_positions mp ON m.id = mp.matrix_id 
          WHERE m.status = 'CLOSED' AND mp.user_id = ?
          ORDER BY m.id DESC
        `).all(req.user.id),
        db.prepare("SELECT * FROM documents WHERE user_id = ?").all(req.user.id),
        db.prepare("SELECT `key`, value FROM settings").all() // Get all settings at once to avoid 28 sequential queries
      ]);

      const transactions = Array.from(new Map((transactionsRaw as any[]).map(t => [t.id, t])).values());
      const uniqueTransactions = transactions; // Compatibilidade com código legado

      // Map settings efficiently
      const settingsMap = new Map((settingsData as any[]).map(s => [s.key, s.value]));
      const getSettingVal = (key: string, defaultVal: string) => settingsMap.get(key) || defaultVal;

      const bannerUrl = getSettingVal('banner_url', 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop');
      const logoUrl = getSettingVal('logo_url', '');

      const matrixSettings = {
        adhesionFee: parseFloat(getSettingVal('matrix_adhesion_fee', '650')),
        onboardBonus: parseFloat(getSettingVal('matrix_onboard_bonus', '100')),
        cashboardBonus: parseFloat(getSettingVal('matrix_cashboard_bonus', '3990')),
        referralBonus: parseFloat(getSettingVal('matrix_referral_bonus', '100')),
        minReferralsToCycle: parseInt(getSettingVal('matrix_min_referrals_to_cycle', '2')),
        flowEconomy: parseFloat(getSettingVal('flow_economy', '0')),
        themeNeonGreen: getSettingVal('theme_neon_green', '#39ff14'),
        themeNeonBlue: getSettingVal('theme_neon_blue', '#00f3ff'),
        themeNeonPurple: getSettingVal('theme_neon_purple', '#bc13fe'),
        themeNeonOrange: getSettingVal('theme_neon_orange', '#ff6700'),
        themeNeonPink: getSettingVal('theme_neon_pink', '#ff00ff'),
        service_corridas_visible: getSettingVal('service_corridas_visible', 'true'),
        service_corridas_enabled: getSettingVal('service_corridas_enabled', 'true'),
        service_snack_visible: getSettingVal('service_snack_visible', 'true'),
        service_snack_enabled: getSettingVal('service_snack_enabled', 'true'),
        service_energy_visible: getSettingVal('service_energy_visible', 'true'),
        service_energy_enabled: getSettingVal('service_energy_enabled', 'true'),
        service_guincho_visible: getSettingVal('service_guincho_visible', 'true'),
        service_guincho_enabled: getSettingVal('service_guincho_enabled', 'true'),
        service_bonus_hability_test_visible: getSettingVal('service_bonus_hability_test_visible', 'true'),
        service_bonus_hability_test_enabled: getSettingVal('service_bonus_hability_test_enabled', 'true'),
        service_guincho_urbano_price: getSettingVal('service_guincho_urbano_price', '180'),
        service_guincho_interurbano_price: getSettingVal('service_guincho_interurbano_price', '450'),
        service_assistencia_mensal_price: getSettingVal('service_assistencia_mensal_price', '85'),
        service_corridas_curta_price: getSettingVal('service_corridas_curta_price', '15'),
        service_corridas_media_price: getSettingVal('service_corridas_media_price', '35'),
        service_corridas_longa_price: getSettingVal('service_corridas_longa_price', '75'),
        service_snack_rapido_price: getSettingVal('service_snack_rapido_price', '25'),
        service_snack_completa_price: getSettingVal('service_snack_completa_price', '55'),
        service_snack_familia_price: getSettingVal('service_snack_familia_price', '120'),
        service_energy_drink_price: getSettingVal('service_energy_drink_price', '12'),
        service_energy_kit_price: getSettingVal('service_energy_kit_price', '150'),
        service_energy_plano_price: getSettingVal('service_energy_plano_price', '290'),
        service_bonus_hability_test_price_1: getSettingVal('service_bonus_hability_test_price_1', '100'),
        service_bonus_hability_test_price_2: getSettingVal('service_bonus_hability_test_price_2', '250'),
        service_bonus_hability_test_price_3: getSettingVal('service_bonus_hability_test_price_3', '500')
      };

      res.json({
        user,
        matrices: matricesWithPositions,
        notifications,
        transactions: uniqueTransactions,
        banner: { url: bannerUrl },
        logo: { url: logoUrl },
        history,
        documents,
        matrixSettings
      });
    } catch (err) {
      console.error("Error in /api/init:", err);
      res.status(500).json({ error: "Erro interno do servidor", details: err instanceof Error ? err.message : String(err) });
    }
  });

  app.post("/api/auth/login", authLimiter, catchAsync(async (req: express.Request, res: express.Response) => {
    const { email, password } = loginSchema.parse(req.body);

    const userRecord = await db.prepare("SELECT id, password, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar, referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE email = ?").get(email) as any;
    
    if (!userRecord || !(await verifyPassword(password, userRecord.password))) {
      return res.status(401).json({ error: "Usuário não encontrado ou credenciais inválidas" });
    }

    // If legacy hash, migrate to bcrypt on successful login
    if (!userRecord.password.startsWith('$2b$') && !userRecord.password.startsWith('$2a$')) {
      const bcryptHash = await hashPassword(password);
      await db.prepare("UPDATE users SET password = ? WHERE id = ?").run(bcryptHash, userRecord.id);
    }
    
    const { password: _pw, ...userWithoutPassword } = userRecord;
    const token = generateToken(userRecord.id, userRecord.email);
    res.json({ ...userWithoutPassword, token });
  }));

  app.post("/api/auth/register", authLimiter, catchAsync(async (req: any, res: any) => {
    const validatedData = registerSchema.parse(req.body);
    const { name, email, password, cpf, phone } = validatedData;
    const { nickname, birthDate, referrerId, referralCode, firebaseUid } = req.body;

    const existingUser = await db.prepare("SELECT id FROM users WHERE email = ? OR cpf = ?").get(email, cpf) as any;
    if (existingUser) {
      return res.status(400).json({ error: "Email ou CPF já cadastrado" });
    }

    if (firebaseUid) {
      const existingFirebase = await db.prepare("SELECT id FROM users WHERE firebase_uid = ?").get(firebaseUid);
      if (existingFirebase) {
        return res.status(400).json({ error: "Este usuário já possui um cadastro vinculado." });
      }
    }

    const existingNickname = await db.prepare("SELECT id FROM users WHERE nickname = ?").get(nickname);
    if (existingNickname) {
      return res.status(400).json({ error: "Este apelido já está sendo usado por outro usuário." });
    }

    let finalReferrerId = referrerId;
    if (referralCode && !finalReferrerId) {
      let referrer = await db.prepare("SELECT id FROM users WHERE referral_code = ?").get(referralCode) as any;
      if (!referrer) {
        referrer = await db.prepare("SELECT id FROM users WHERE nickname = ?").get(referralCode) as any;
      }
      
      if (referrer) {
        finalReferrerId = referrer.id;
      } else {
        return res.status(400).json({ error: "Código de indicação inválido." });
      }
    }

    const id = generateId("user");
    const newReferralCode = generateReferralCode(name);
    const hashedPassword = password ? await hashPassword(password) : null;
    
    await db.prepare("INSERT INTO users (id, firebase_uid, name, nickname, email, password, cpf, phone, birth_date, referrer_id, referral_code, is_activated) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)").run(
      id, firebaseUid || null, name, nickname, email, hashedPassword, cpf, phone, birthDate, finalReferrerId || null, newReferralCode
    );

    const pendingVouchers = await db.prepare("SELECT id, amount FROM vouchers WHERE (recipient_email = ? OR recipient_phone = ?) AND status = 'SENT'").all(email, phone) as any[];
    for (const v of pendingVouchers) {
      await db.prepare("UPDATE vouchers SET owner_id = ?, recipient_id = ?, recipient_email = NULL, recipient_phone = NULL WHERE id = ?").run(id, id, v.id);
      await NotificationManager.createNotification(id, 'VOUCHER_RECEIVED', `Você recebeu um voucher de presente de R$ ${v.amount.toFixed(2)} que estava aguardando seu cadastro! 🎁`);
    }

    const user = await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, IF(avatar IS NOT NULL AND avatar != '', CONCAT('/api/users/', id, '/avatar'), NULL) as avatar, referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(id);
    const token = generateToken(id, email);
    res.json({ ...(user as any), token });
  }));

  app.post("/api/user/update", authenticateUser, async (req: any, res) => {
    try {
      const { id, name, nickname, email, phone, pixKey, birthDate, avatar, reentryMode, bankName, bankAgency, bankAccount, bankAccountType, password } = req.body;
      
      if (req.user.id !== id && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const existingEmail = await db.prepare("SELECT id FROM users WHERE email = ? AND id != ?").get(email, id);
      if (existingEmail) {
        return res.status(400).json({ error: "Este e-mail já está sendo usado por outra conta." });
      }

      await db.prepare(`
        UPDATE users 
        SET name = ?, nickname = ?, email = ?, phone = ?, pix_key = ?, birth_date = ?, avatar = ?, reentry_mode = ?,
            bank_name = ?, bank_agency = ?, bank_account = ?, bank_account_type = ?
        WHERE id = ?
      `).run(
        name, nickname, email, phone, pixKey, birthDate, avatar, reentryMode || 'AUTO',
        bankName, bankAgency, bankAccount, bankAccountType, id
      );

      if (password) {
        const hashedPassword = await hashPassword(password);
        await db.prepare("UPDATE users SET password = ? WHERE id = ?").run(hashedPassword, id);
      }
      const user = await db.prepare(`
        SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, avatar, 
               referrals_count as referralsCount, balance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, 
               document_status as documentStatus, stars, status, career_level as careerLevel, 
               referral_code as referralCode, reentry_mode as reentryMode,
               bank_name as bankName, bank_agency as bankAgency, bank_account as bankAccount, bank_account_type as bankAccountType,
               is_activated as isActivated
        FROM users 
        WHERE id = ?
      `).get(id);
      res.json(user);
    } catch (err) {
      console.error("Error in /api/user/update:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/user/activate", authenticateUser, async (req: any, res) => {
    try {
      const { userId } = req.body;
      console.log("[debug:license][/api/user/activate]", {
        authUserId: req.user.id,
        bodyUserId: userId,
      });
      if (req.user.id !== userId && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }

      if (user.is_activated) {
        return res.status(400).json({ error: "Licença já está ativa" });
      }

      const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
      await activateUserLicenseAfterGatewayPayment(userId, adhesionFee);

      console.log("[debug:license][/api/user/activate] concluído com sucesso", { userId });
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/user/activate:", err);
      res.status(500).json({ error: "Erro ao ativar licença" });
    }
  });

  /**
   * Checkout Pro (Mercado Pago) para taxa de adesão da licença.
   * Persiste em license_checkouts; ativação (is_activated) ocorre após webhook confirmar pagamento.
   */
  app.post("/api/license/checkout-pro", authenticateUser, async (req: any, res) => {
    try {
      if (!isMercadoPagoConfigured()) {
        return res.status(503).json({
          error: "Pagamento não configurado. Defina MERCADOPAGO_ACCESS_TOKEN no servidor.",
        });
      }

      const userId = req.user.id as string;
      const user = (await db
        .prepare(
          "SELECT id, email, name, is_activated as isActivated FROM users WHERE id = ?"
        )
        .get(userId)) as { id: string; email: string | null; name: string | null; isActivated: number } | null;

      console.log("[debug:license][/api/license/checkout-pro] início", { userId, hasUser: !!user });
      if (!user) {
        return res.status(404).json({ error: "Usuário não encontrado" });
      }
      if (user.isActivated) {
        return res.status(400).json({ error: "Licença já está ativa" });
      }
      const email = (user.email ?? "").trim();
      if (!email) {
        return res.status(400).json({ error: "Cadastre um e-mail na conta para pagar com Mercado Pago." });
      }

      const adhesionFee = parseFloat(await getSetting("matrix_adhesion_fee", "650"));
      if (!Number.isFinite(adhesionFee) || adhesionFee <= 0) {
        return res.status(500).json({ error: "Valor de adesão inválido nas configurações." });
      }

      const checkoutId = generateId("lc");
      const externalReference = `${LICENSE_CHECKOUT_PREFIX}${checkoutId}`;

      const nameParts = (user.name ?? "").trim().split(/\s+/);
      const firstName = nameParts[0] || "Cliente";
      const surname = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const pref = await createCheckoutProPreferenceWithAppPaths({
        externalReference,
        title: "Licença de Uso MOBICYCLE — Taxa de adesão",
        itemId: "license_adhesion",
        amount: adhesionFee,
        payer: { email, name: firstName, surname },
        statementDescriptor: "MOBICYCLE",
        successPath: "/?licensePayment=success",
        pendingPath: "/?licensePayment=pending",
        failurePath: "/?licensePayment=failure",
      });

      await db
        .prepare(
          `INSERT INTO license_checkouts (
            id, user_id, external_reference, preference_id, amount, currency_id, status
          ) VALUES (?, ?, ?, ?, ?, 'BRL', 'PENDING')`
        )
        .run(checkoutId, userId, externalReference, pref.preferenceId, adhesionFee);

      console.log("[debug:license][/api/license/checkout-pro] preferência criada", {
        userId,
        checkoutId,
        externalReference,
        preferenceId: pref.preferenceId,
        amount: adhesionFee,
      });
      res.json({
        checkoutUrl: pref.checkoutUrl,
        preferenceId: pref.preferenceId,
        externalReference,
        checkoutId,
        amount: adhesionFee,
      });
    } catch (err) {
      console.error("Error in /api/license/checkout-pro:", err);
      const msg = err instanceof Error ? err.message : "Erro ao iniciar checkout";
      if (msg.includes("MERCADOPAGO_ACCESS_TOKEN")) {
        return res.status(503).json({ error: "Pagamento não configurado no servidor." });
      }
      res.status(500).json({ error: msg || "Erro ao iniciar checkout de licença" });
    }
  });

  /**
   * Mercado Pago — webhooks de pagamento (Checkout Pro).
   * GET e POST: a documentação envia query (topic, id / data.id) e opcionalmente corpo JSON.
   */
  const mercadoPagoWebhook = async (req: express.Request, res: express.Response) => {
    const hdr = req.headers as unknown as Record<string, unknown>;
    const q = req.query as Record<string, unknown>;

    const bodyObj = req.body && typeof req.body === "object" ? (req.body as Record<string, unknown>) : null;
    console.log("[debug:license][/api/webhooks/mercadopago]", {
      method: req.method,
      query: q,
      bodyKeys: bodyObj ? Object.keys(bodyObj) : [],
      bodyType: bodyObj?.type,
      bodyDataId: (bodyObj?.data as { id?: unknown } | undefined)?.id,
      bodyId: bodyObj?.id,
    });

    try {
      if (!isMercadoPagoConfigured()) {
        logger.warn("[MP webhook] MERCADOPAGO_ACCESS_TOKEN ausente — ignorando notificação");
        return res.status(503).send("Misconfigured");
      }

      if (process.env.MERCADOPAGO_WEBHOOK_SECRET?.trim()) {
        const ok = verifyMercadoPagoWebhookSignatureFromEnv(hdr, q, req.body);
        if (!ok) {
          logger.warn("[MP webhook] assinatura x-signature inválida ou incompleta");
          console.log("[debug:license][/api/webhooks/mercadopago] assinatura FALHOU (401)");
          return res.status(401).send("Unauthorized");
        }
        console.log("[debug:license][/api/webhooks/mercadopago] assinatura OK");
      } else {
        logger.warn(
          "[MP webhook] MERCADOPAGO_WEBHOOK_SECRET não definido — assinatura não validada (configure em produção)"
        );
      }

      const topic = String(q.topic ?? q.type ?? "").toLowerCase();
      if (topic && topic !== "payment" && topic !== "merchant_order") {
        console.log("[debug:license][/api/webhooks/mercadopago] topic ignorado, ACK", { topic });
        return res.status(200).send("OK");
      }

      if (topic === "merchant_order") {
        const orderId = extractMerchantOrderIdFromNotification(req.body, q);
        if (!orderId) {
          console.log("[debug:license][/api/webhooks/mercadopago] merchant_order sem id, ACK");
          return res.status(200).send("OK");
        }
        console.log("[debug:license][/api/webhooks/mercadopago] merchant_order id", orderId);
        let orderJson: unknown;
        try {
          orderJson = await fetchMercadoPagoMerchantOrderById(orderId);
        } catch (orderErr: unknown) {
          const msg = orderErr instanceof Error ? orderErr.message : String(orderErr);
          logger.error(`[MP webhook] merchant_orders/${orderId} falhou: ${msg}`);
          console.log("[debug:license][/api/webhooks/mercadopago] merchant_order fetch ERRO", { orderId, msg });
          return res.status(502).send("Merchant order fetch failed");
        }
        const order = orderJson as { payments?: unknown };
        const rawList = order.payments;
        const payList = Array.isArray(rawList) ? rawList : [];
        console.log("[debug:license][/api/webhooks/mercadopago] merchant_order payments", payList.length);
        for (const entry of payList) {
          let row: MercadoPagoPaymentLike;
          if (typeof entry === "number" || (typeof entry === "string" && /^\d+$/.test(entry.trim()))) {
            const pid = String(entry).trim();
            try {
              row = await getMercadoPagoPaymentById(pid);
            } catch (pe: unknown) {
              logger.warn(
                `[MP webhook] merchant_order: GET payment ${pid} (id na lista) falhou — ${pe instanceof Error ? pe.message : String(pe)}`
              );
              continue;
            }
          } else if (entry && typeof entry === "object") {
            row = entry as MercadoPagoPaymentLike;
          } else {
            continue;
          }
          const pid = row.id != null ? String(row.id).trim() : "";
          if (!/^\d+$/.test(pid)) continue;
          let full: MercadoPagoPaymentLike = row;
          const hasRef = typeof row.external_reference === "string" && row.external_reference.trim().length > 0;
          const needsFetch =
            !hasRef ||
            row.status == null ||
            row.transaction_amount == null ||
            !row.currency_id;
          if (needsFetch) {
            try {
              full = await getMercadoPagoPaymentById(pid);
            } catch (pe: unknown) {
              logger.warn(
                `[MP webhook] merchant_order: GET payment ${pid} falhou — ${pe instanceof Error ? pe.message : String(pe)}`
              );
              continue;
            }
          }
          const outcome = await tryActivateLicenseFromMercadoPagoPayment(full, pid);
          if (outcome === "activated") {
            return res.status(200).send("OK");
          }
        }
        return res.status(200).send("OK");
      }

      const paymentId = extractPaymentIdFromNotification(req.body, q);
      if (!paymentId) {
        console.log("[debug:license][/api/webhooks/mercadopago] sem paymentId, ACK");
        return res.status(200).send("OK");
      }
      console.log("[debug:license][/api/webhooks/mercadopago] paymentId", paymentId);

      const isMpPaymentNotFoundError = (fetchErr: unknown): boolean => {
        const e = fetchErr as { message?: string; status?: number; cause?: { status?: number } };
        const msg = String(e?.message ?? fetchErr ?? "");
        const httpStatus = e?.status ?? e?.cause?.status;
        return (
          httpStatus === 404 ||
          /\bnot\s+found\b/i.test(msg) ||
          /\b404\b/.test(msg)
        );
      };

      const sleep = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

      /** MP pode notificar antes do GET /payments/:id consolidar (ex.: tela "processando pagamento"). */
      const maxPaymentFetchAttempts = 8;
      let payment: Awaited<ReturnType<typeof getMercadoPagoPaymentById>> | undefined;
      let lastFetchErr: unknown;
      for (let attempt = 1; attempt <= maxPaymentFetchAttempts; attempt++) {
        try {
          payment = await getMercadoPagoPaymentById(paymentId);
          lastFetchErr = undefined;
          break;
        } catch (fetchErr: unknown) {
          lastFetchErr = fetchErr;
          if (isMpPaymentNotFoundError(fetchErr) && attempt < maxPaymentFetchAttempts) {
            logger.warn(
              `[MP webhook] GET payment ${paymentId} 404 (tentativa ${attempt}/${maxPaymentFetchAttempts}); nova tentativa após atraso.`
            );
            console.log("[debug:license][/api/webhooks/mercadopago] get payment 404 — retry", {
              paymentId,
              attempt,
            });
            await sleep(600 * attempt);
            continue;
          }
          if (isMpPaymentNotFoundError(fetchErr)) {
            logger.error(
              `[MP webhook] GET payment ${paymentId} ainda 404 após ${maxPaymentFetchAttempts} tentativas. ` +
                "Se o token estiver correto, o MP pode liberar o pagamento no próximo webhook (ex.: merchant_order). " +
                "Respondendo 502 para o MP reenviar a notificação."
            );
            console.log("[debug:license][/api/webhooks/mercadopago] get payment 404 definitivo — 502 p/ retry MP", {
              paymentId,
            });
            return res.status(502).send("Payment not visible or token mismatch");
          }
          throw fetchErr;
        }
      }
      if (!payment) {
        throw lastFetchErr ?? new Error("Falha ao obter pagamento MP");
      }

      const outcome = await tryActivateLicenseFromMercadoPagoPayment(payment, paymentId);
      if (outcome === "activated") {
        return res.status(200).send("OK");
      }
      return res.status(200).send("OK");
    } catch (err) {
      logger.error("[MP webhook] erro ao processar:", err);
      console.log("[debug:license][/api/webhooks/mercadopago] ERRO 500", {
        message: err instanceof Error ? err.message : String(err),
      });
      return res.status(500).send("Error");
    }
  };

  app.post("/api/webhooks/mercadopago", mercadoPagoWebhook);
  app.get("/api/webhooks/mercadopago", mercadoPagoWebhook);

  app.get("/api/transactions", authenticateUser, async (req: any, res) => {
    try {
      const transactions = await db.prepare("SELECT id, amount, type, description, status, created_at as createdAt FROM transactions WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(req.user.id);
      const uniqueTransactions = Array.from(new Map(transactions.map((t: any) => [t.id, t]) as any).values());
      const adhesion = uniqueTransactions.filter((t: any) => t.type === "ADHESION");
      console.log("[debug:license][/api/transactions]", {
        userId: req.user.id,
        total: uniqueTransactions.length,
        adhesionCount: adhesion.length,
        lastTypes: uniqueTransactions.slice(0, 5).map((t: any) => t.type),
      });
      res.json(uniqueTransactions);
    } catch (err) {
      console.error("Error in /api/transactions:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/documents", authenticateUser, async (req: any, res) => {
    try {
      const documents = await db.prepare("SELECT id, user_id as userId, filename, type, status, rejection_reason as rejectionReason, amount, created_at as createdAt FROM documents WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/documents/upload", authenticateUser, async (req: any, res) => {
    try {
      const { userId, filename, content, type } = req.body;
      if (!userId || !content || !type) return res.status(400).json({ error: "Dados incompletos" });

      if (req.user.id !== userId && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const user = await db.prepare("SELECT referrals_count FROM users WHERE id = ?").get(userId) as any;
      if (!user) return res.status(404).json({ error: "Usuário não encontrado" });

      let status = 'PENDING';
      let rejectionReason = null;
      let amount = null;

      if (type === 'NFSE') {
        try {
          const result = await parseStringPromise(content);
          const nfseRoot = 
            result?.CompNfse?.Nfse?.[0]?.InfNfse?.[0] || 
            result?.Nfse?.InfNfse?.[0] || 
            result?.Nfse?.InfNfse ||
            result?.ConsultarNfseResposta?.ListaNfse?.[0]?.CompNfse?.[0]?.Nfse?.[0]?.InfNfse?.[0] ||
            result?.NFe?.infNFe?.[0] || 
            result?.NFe?.infNFe;

          if (!nfseRoot) {
            return res.status(400).json({ error: "Estrutura XML inválida ou NFS-e não encontrada." });
          }

          const tomadorCnpj = 
            nfseRoot?.TomadorServico?.[0]?.IdentificacaoTomador?.[0]?.CpfCnpj?.[0]?.Cnpj?.[0] ||
            nfseRoot?.Tomador?.[0]?.CpfCnpj?.[0]?.CNPJ?.[0] ||
            nfseRoot?.dest?.[0]?.CNPJ?.[0] ||
            '';

          const grossAmountStr = 
            nfseRoot?.Servico?.[0]?.Valores?.[0]?.ValorServicos?.[0] ||
            nfseRoot?.total?.[0]?.ICMSTot?.[0]?.vNF?.[0] ||
            '0';
          
          amount = parseFloat(grossAmountStr.replace(',', '.'));
          const cleanSeseCnpj = SESE_CNPJ.replace(/[^\d]/g, '');
          const cleanTomadorCnpj = tomadorCnpj.replace(/[^\d]/g, '');

          if (cleanTomadorCnpj !== cleanSeseCnpj) {
            status = 'REJECTED';
            rejectionReason = `CNPJ do tomador (${tomadorCnpj || 'não encontrado'}) não corresponde ao da Mobicyclo.`;
          } else {
            const requiredAmount = user.referrals_count >= 1 ? (parseFloat(await getSetting('matrix_cashboard_bonus', '3990')) / 2) : parseFloat(await getSetting('matrix_cashboard_bonus', '3990'));
            if (amount < requiredAmount) {
              status = 'REJECTED';
              rejectionReason = `Valor bruto (R$ ${amount.toFixed(2)}) insuficiente. Mínimo necessário: R$ ${requiredAmount.toFixed(2)}`;
            } else {
              status = 'APPROVED';
            }
          }
        } catch (xmlErr) {
          return res.status(400).json({ error: "Erro ao processar arquivo XML." });
        }
      } else if (type === 'ADDRESS_PROOF_LUZ' || type === 'ADDRESS_PROOF_PHONE') {
        status = 'PENDING';
      } else {
        return res.status(400).json({ error: "Tipo de documento inválido." });
      }

      const docId = generateId("doc");
      await db.prepare("INSERT INTO documents (id, user_id, filename, content, type, status, rejection_reason, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").run(
        docId, userId, filename, content, type, status, rejectionReason, amount
      );

      if (status === 'APPROVED') {
        await db.prepare("UPDATE users SET document_status = 'VALIDATED' WHERE id = ?").run(userId);
      } else if (status === 'REJECTED') {
        await db.prepare("UPDATE users SET document_status = 'REJECTED' WHERE id = ?").run(userId);
      }

      res.json({ 
        id: docId, 
        status, 
        rejectionReason, 
        amount,
        message: status === 'APPROVED' ? 'Documento validado com sucesso!' : 
                 status === 'PENDING' ? 'Documento enviado para análise manual.' : 
                 'Documento rejeitado.'
      });
    } catch (err) {
      console.error("Error in /api/documents/upload:", err);
      res.status(500).json({ error: "Erro ao processar documento" });
    }
  });

  app.get("/api/admin/documents", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const documents = await db.prepare(`
        SELECT d.id, d.user_id as userId, d.filename, d.type, d.status, d.rejection_reason as rejectionReason, d.amount, d.created_at as createdAt, u.name as userName, u.email as userEmail
        FROM documents d
        JOIN users u ON d.user_id = u.id
        ORDER BY d.created_at DESC
      `).all();
      res.json(documents);
    } catch (err) {
      console.error("Error in /api/admin/documents:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/user/referrals", authenticateUser, async (req: any, res) => {
    try {
      const referrals = await db.prepare(`
        SELECT id, name, nickname, email, status, avatar, created_at as createdAt 
        FROM users 
        WHERE referrer_id = ? 
        ORDER BY created_at DESC
      `).all(req.user.id);
      
      const uniqueReferrals = Array.from(new Map(referrals.map((r: any) => [r.id, r]) as any).values());
      res.json(uniqueReferrals);
    } catch (err) {
      res.status(500).json({ error: "Erro interno ao buscar indicados" });
    }
  });

  app.get("/api/settings/all", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const settings = await db.prepare("SELECT * FROM settings").all();
      const settingsMap = settings.reduce((acc: any, curr: any) => {
        acc[curr.key] = curr.value;
        return acc;
      }, {});
      res.json(settingsMap);
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/settings/update", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { settings } = req.body;
      await withTransaction(async () => {
        for (const [key, value] of Object.entries(settings)) {
          await ensureSetting(key, String(value));
        }
      });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/settings/banner", async (req, res) => {
    try {
      const banner = await db.prepare("SELECT value FROM settings WHERE `key` = 'banner_url'").get() as any;
      res.json({ url: banner?.value || 'https://images.unsplash.com/photo-1593941707882-a5bba14938c7?q=80&w=2070&auto=format&fit=crop' });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/settings/logo", async (req, res) => {
    try {
      const logo = await db.prepare("SELECT value FROM settings WHERE `key` = 'logo_url'").get() as any;
      res.json({ url: logo?.value || '' });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/settings/banner", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { url } = req.body;
      await ensureSetting('banner_url', url);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/notifications", authenticateUser, async (req: any, res) => {
    try {
      const notifications = await db.prepare("SELECT id, type, message, is_read as isRead, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50").all(req.user.id);
      res.json(notifications);
    } catch (err) {
      console.error("Error in /api/notifications:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/notifications/:id/read", authenticateUser, async (req: any, res) => {
    try {
      const { id } = req.params;
      const notification = await db.prepare("SELECT user_id FROM notifications WHERE id = ?").get(id) as any;
      if (!notification || (notification.user_id !== req.user.id && !isUserAdmin(req.user))) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db.prepare("UPDATE notifications SET is_read = 1 WHERE id = ?").run(id);
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/notifications/read:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/push/vapid-public-key", async (req, res) => {
    try {
      const keysSetting = await db.prepare("SELECT value FROM settings WHERE `key` = 'vapid_keys'").get() as any;
      const keys = JSON.parse(keysSetting.value);
      res.json({ publicKey: keys.publicKey });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/push/subscribe", authenticateUser, async (req: any, res) => {
    try {
      const { subscription, userId } = req.body;
      if (!userId || !subscription) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      if (req.user.id !== userId && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      await db.prepare("REPLACE INTO push_subscriptions (user_id, subscription) VALUES (?, ?)").run(
        userId, JSON.stringify(subscription)
      );
      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/push/subscribe:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/matrices/history", authenticateUser, async (req: any, res) => {
    try {
      const history = await db.prepare("SELECT * FROM matrix_cycles WHERE user_id = ? ORDER BY created_at DESC").all(req.user.id);
      const uniqueHistory = Array.from(new Map(history.map((h: any) => [h.id, h]) as any).values());
      res.json(uniqueHistory);
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  // S08: Protected leaderboard — requires authentication
  app.get("/api/affiliates/leaderboard", authenticateUser, async (req: any, res) => {
    try {
      const topUsers = await db.prepare(`
        SELECT id, name, nickname, avatar, referrals_count, status, career_level 
        FROM users 
        WHERE referrals_count > 0 
        ORDER BY referrals_count DESC 
        LIMIT 10
      `).all();
      res.json(topUsers);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar ranking" });
    }
  });

  app.get("/api/matrices", authenticateUser, async (req: any, res) => {
    try {
      const isAdmin = isUserAdmin(req.user);
      const type = req.query.type as string;

      let matricesWithPositions: any[] = [];
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const offset = (page - 1) * limit;
      
      if (isAdmin) {
        let query = "SELECT * FROM matrices WHERE status = 'OPEN'";
        let params: any[] = [];
        if (type) {
          query += " AND type = ?";
          params.push(type);
        }
        query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
        params.push(limit, offset);
        
        const matrices = await db.prepare(query).all(...params);
        if (matrices.length > 0) {
          const matrixIds = matrices.map((m: any) => m.id);
          const placeholders = matrixIds.map(() => '?').join(',');
          const allPositions = await db.prepare(`
            SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.cycle_sales_count as cycleSalesCount
            FROM matrix_positions mp 
            JOIN users u ON mp.user_id = u.id 
            WHERE mp.matrix_id IN (${placeholders})
          `).all(...matrixIds);

          const positionsByMatrix = allPositions.reduce((acc: any, p: any) => {
            if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
            acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
            return acc;
          }, {});

          matricesWithPositions = matrices.map((m: any) => ({
            ...m,
            positions: positionsByMatrix[m.id] || []
          }));
        }
      } else {
        let query = `
          SELECT DISTINCT m.* 
          FROM matrices m 
          JOIN matrix_positions mp ON m.id = mp.matrix_id 
          WHERE m.status = 'OPEN' AND mp.user_id = ?
        `;
        let params: any[] = [req.user.id];
        if (type) {
          query += " AND m.type = ?";
          params.push(type);
        }
        
        const matrices = await db.prepare(query).all(...params);

        if (matrices.length > 0) {
          const allPositions = await db.prepare(`
            SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.cycle_sales_count as cycleSalesCount
            FROM matrix_positions mp 
            JOIN users u ON mp.user_id = u.id 
            WHERE mp.matrix_id IN (
              SELECT matrix_id FROM matrix_positions WHERE user_id = ?
            )
          `).all(req.user.id);

          const positionsByMatrix = allPositions.reduce((acc: any, p: any) => {
            if (!acc[p.matrix_id]) acc[p.matrix_id] = [];
            acc[p.matrix_id].push({ ...p, userName: p.name, userNickname: p.nickname });
            return acc;
          }, {});

          matricesWithPositions = matrices.map((m: any) => ({
            ...m,
            positions: positionsByMatrix[m.id] || []
          }));
        }
      }
      
      res.json(matricesWithPositions);
    } catch (err) {
      console.error("Error in /api/matrices:", err);
      res.status(500).json({ error: "Erro ao buscar matrizes" });
    }
  });

  app.post("/api/matrices/join", authenticateUser, async (req: any, res) => {
    try {
      const { userId, referrerId } = req.body;

      if (req.user.id !== userId && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const activePosition = await db.prepare("SELECT mp.matrix_id FROM matrix_positions mp JOIN matrices m ON mp.matrix_id = m.id WHERE mp.user_id = ? AND m.status = 'OPEN'").get(userId);
      if (activePosition) {
        return res.status(400).json({ error: "Você já possui uma posição ativa no sistema (On-Board ou Cash-Board). Aguarde o ciclo para reentrar." });
      }

      const formationRule = await getSetting('matrix_formation_rule', 'FILL_BASE');
      let matrix: any = null;

      if (formationRule === 'FOLLOW_REFERRER') {
        if (referrerId) {
          const referrerMatrix = await db.prepare(`
            SELECT m.id 
            FROM matrices m 
            JOIN matrix_positions mp ON m.id = mp.matrix_id 
            WHERE mp.user_id = ? AND m.type = 'ONBORD' AND m.status = 'OPEN'
            LIMIT 1
          `).get(referrerId);
          if (referrerMatrix) matrix = referrerMatrix;
        }
      }

      if (!matrix) {
        const openMatrices = await db.prepare("SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC").all();
        matrix = openMatrices.length > 0 ? openMatrices[0] : null;
      }

      if (!matrix) {
        matrix = await MatrixManager.createMatrix('ONBORD');
      }
      const existing = await db.prepare("SELECT * FROM matrix_positions WHERE matrix_id = ? AND user_id = ?").get(matrix.id, userId);
      if (existing) return res.status(400).json({ error: "Usuário já está nesta matriz" });

      if (referrerId && referrerId !== userId) {
        await FinancialManager.addReferralBonus(referrerId, userId);
        const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
        await FinancialManager.payInfiniteBonus(userId, adhesionFee);
        await FinancialManager.payLicenseUnilevelBonus(userId);
      }

      const result = await MatrixManager.fillPosition(matrix.id, userId);
      if (result.error) return res.status(400).json(result);

      await FinancialManager.incrementNetworkSales(userId);
      await db.prepare("UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'").run(userId);

      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/matrices/join:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/matrices/summary", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const matrices = await db.prepare(`
        SELECT m.id, m.type, m.status, m.created_at as createdAt,
               (SELECT COUNT(*) FROM matrix_positions WHERE matrix_id = m.id) as filledPositions
        FROM matrices m
        WHERE m.status = 'OPEN'
        ORDER BY m.created_at DESC
      `).all();

      res.json(matrices);
    } catch (err) {
      console.error("Error in /api/admin/matrices/summary:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/admin/fill-matrix", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { matrixId, userId, referrerId } = req.body;
      
      const user = await db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
      if (!user) {
        await db.prepare("INSERT INTO users (id, name, email, cpf) VALUES (?, ?, ?, ?)").run(
          userId, `Convidado ${userId}`, `${userId}@example.com`, `CPF-${userId}`
        );
      }

      if (referrerId && referrerId !== userId) {
        await FinancialManager.addReferralBonus(referrerId, userId);
        const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
        await FinancialManager.payInfiniteBonus(userId, adhesionFee);
        await FinancialManager.payLicenseUnilevelBonus(userId);
      }

      const activePosition = await db.prepare("SELECT mp.matrix_id FROM matrix_positions mp JOIN matrices m ON mp.matrix_id = m.id WHERE mp.user_id = ? AND m.status = 'OPEN'").get(userId);
      if (activePosition) {
        return res.status(400).json({ error: "Este usuário já possui uma posição ativa no sistema." });
      }

      const result = await MatrixManager.fillPosition(matrixId, userId);
      if (result.error) return res.status(400).json(result);

      await db.prepare("UPDATE users SET status = 'BRONZE' WHERE id = ? AND status = 'PARTNER'").run(userId);

      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/admin/fill-matrix:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.post("/api/matrices/reentry", authenticateUser, async (req: any, res) => {
    try {
      const { userId } = req.body;

      if (req.user.id !== userId && !isUserAdmin(req.user)) {
        return res.status(403).json({ error: "Acesso negado" });
      }

      const result = await MatrixManager.processReentryInternal(userId);
      if (result.error) return res.status(400).json(result);
      res.json({ success: true, cycleInfo: result.cycleInfo });
    } catch (err) {
      console.error("Error in /api/matrices/reentry:", err);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  app.get("/api/admin/matrix/:id/details", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const matrix = await db.prepare("SELECT * FROM matrices WHERE id = ?").get(id) as any;
      if (!matrix) return res.status(404).json({ error: "Matriz não encontrada" });

      const positions = await db.prepare(`
        SELECT mp.position, u.id as userId, u.name, u.nickname, u.email, u.status, u.career_level as careerLevel, u.referrals_count as referralsCount
        FROM matrix_positions mp
        JOIN users u ON mp.user_id = u.id
        WHERE mp.matrix_id = ?
        ORDER BY mp.position ASC
      `).all(id);

      const history = await db.prepare(`
        SELECT mh.*, u.name as userName
        FROM matrix_history mh
        JOIN users u ON mh.user_id = u.id
        WHERE mh.matrix_id = ?
        ORDER BY mh.created_at DESC
        LIMIT 50
      `).all(id);

      const cycles = await db.prepare(`
        SELECT mc.*, u.name as userName
        FROM matrix_cycles mc
        JOIN users u ON mc.user_id = u.id
        WHERE mc.matrix_id = ?
        ORDER BY mc.created_at DESC
        LIMIT 50
      `).all(id);

      res.json({ ...matrix, positions, history, cycles });
    } catch (err) {
      console.error("Error in /api/admin/matrix/:id/details:", err);
      res.status(500).json({ error: "Erro ao buscar detalhes da matriz" });
    }
  });

  app.get("/api/vouchers", authenticateUser, async (req: any, res) => {
    try {
      const vouchers = await db.prepare("SELECT id, code, amount, owner_id as ownerId, recipient_id as recipientId, recipient_email as recipientEmail, recipient_phone as recipientPhone, status, created_at as createdAt FROM vouchers WHERE owner_id = ? OR recipient_id = ? ORDER BY created_at DESC").all(req.user.id, req.user.id);
      res.json(vouchers);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar vouchers" });
    }
  });

  app.post("/api/services/use-cashback", authenticateUser, async (req: any, res) => {
    try {
      const { amount, serviceName } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido" });
      if (!serviceName) return res.status(400).json({ error: "Nome do serviço é obrigatório" });

      const balanceMap: Record<string, string> = {
        'Corridas': 'cashback_balance',
        'Snack': 'snack_fast_cashback',
        'Energy': 'energy_cashback',
        'Bônus Guincho': 'guincho_cashback'
      };

      const balanceColumn = balanceMap[serviceName] || 'cashback_balance';

      const user = await db.prepare(`SELECT ${balanceColumn} as balance FROM users WHERE id = ?`).get(req.user.id) as any;
      if (!user || user.balance < amount) {
        return res.status(400).json({ error: `Saldo de cashback ${serviceName} insuficiente` });
      }

      await withTransaction(async () => {
        await db.prepare(`UPDATE users SET ${balanceColumn} = ${balanceColumn} - ? WHERE id = ?`).run(amount, req.user.id);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED')").run(
          generateId('tx'), req.user.id, -amount, `Uso de Cashback: ${serviceName}`
        );
        await FinancialManager.payCashbackUsageUnilevelBonus(req.user.id, amount, serviceName);
      });

      res.json({ success: true, message: `Serviço ${serviceName} pago com sucesso!` });
    } catch (err) {
      console.error("Error in /api/services/use-cashback:", err);
      res.status(500).json({ error: "Erro ao processar uso de cashback" });
    }
  });

  app.post("/api/financial/deposit", authenticateUser, async (req: any, res) => {
    try {
      const { amount } = req.body;
      const userId = req.user.id;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor de depósito inválido" });
      }

      const updatedUser = await FinancialManager.processDeposit(userId, amount);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Error in /api/financial/deposit:", err);
      res.status(400).json({ error: err instanceof Error ? err.message : "Erro ao processar depósito" });
    }
  });

  app.post("/api/financial/withdraw", authenticateUser, async (req: any, res) => {
    try {
      const { amount, pixKey } = req.body;
      const userId = req.user.id;

      if (!amount || amount <= 0) {
        return res.status(400).json({ error: "Valor de saque inválido" });
      }

      if (!pixKey) {
        return res.status(400).json({ error: "Chave PIX é obrigatória" });
      }

      const updatedUser = await FinancialManager.requestWithdrawal(userId, amount, pixKey);
      res.json({ success: true, user: updatedUser });
    } catch (err) {
      console.error("Error in /api/financial/withdraw:", err);
      res.status(400).json({ error: err instanceof Error ? err.message : "Erro ao processar saque" });
    }
  });

  app.post("/api/vouchers/purchase", authenticateUser, async (req: any, res) => {
    try {
      const { amount } = req.body;
      if (!amount || amount <= 0) return res.status(400).json({ error: "Valor inválido" });

      const user = await db.prepare("SELECT cashback_balance FROM users WHERE id = ?").get(req.user.id) as any;
      if (!user || user.cashback_balance < amount) {
        return res.status(400).json({ error: "Saldo de cashback insuficiente" });
      }

      const voucherId = generateId('vch');
      const voucherCode = generateId('code').toUpperCase();

      await withTransaction(async () => {
        await db.prepare("UPDATE users SET cashback_balance = cashback_balance - ? WHERE id = ?").run(amount, req.user.id);
        await db.prepare("INSERT INTO vouchers (id, code, amount, owner_id, status) VALUES (?, ?, ?, ?, 'AVAILABLE')").run(
          voucherId, voucherCode, amount, req.user.id
        );
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'COMPLETED')").run(
          generateId('tx'), req.user.id, -amount, `Compra de Voucher: ${voucherCode}`
        );
      });

      res.json({ success: true, voucher: { id: voucherId, code: voucherCode, amount } });
    } catch (err) {
      res.status(500).json({ error: "Erro ao adquirir voucher" });
    }
  });

  app.post("/api/vouchers/send", authenticateUser, async (req: any, res) => {
    try {
      const { voucherId, recipientId, recipientEmail, recipientPhone } = req.body;
      if (!voucherId || (!recipientId && !recipientEmail && !recipientPhone)) return res.status(400).json({ error: "Dados incompletos" });

      const sender = await db.prepare("SELECT name, email, nickname, referral_code FROM users WHERE id = ?").get(req.user.id) as any;
      if (!sender) return res.status(404).json({ error: "Remetente não encontrado" });

      const voucher = await db.prepare("SELECT * FROM vouchers WHERE id = ? AND owner_id = ? AND (status = 'AVAILABLE' OR status = 'SENT')").get(voucherId, req.user.id) as any;
      if (!voucher) {
        return res.status(400).json({ error: "Voucher não disponível ou não pertence a você" });
      }

      const appUrl = process.env.APP_URL || 'https://www.mobicycle.com.br';
      const registrationLink = `${appUrl}/?ref=${md5(sender?.email || '')}/${sender?.nickname || ''}`;
      const ruleMessage = "Regra: Somente cadastrados diretos podem usar este voucher em corridas no app de mobilidade.";

      if (recipientId) {
        const recipient = await db.prepare("SELECT id, name FROM users WHERE id = ? AND referrer_id = ?").get(recipientId, req.user.id) as any;
        if (!recipient) {
          return res.status(400).json({ error: "O destinatário deve ser um indicado direto na sua rede para poder usar o voucher." });
        }

        await withTransaction(async () => {
          await db.prepare("UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?").run(recipientId, recipientId, voucherId);
          const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
          await NotificationManager.createNotification(recipientId, 'VOUCHER_RECEIVED', message);
        });
      } else if (recipientEmail) {
        const existingUser = await db.prepare("SELECT id, referrer_id FROM users WHERE email = ?").get(recipientEmail) as any;
        
        if (existingUser) {
          if (existingUser.referrer_id !== req.user.id) {
            return res.status(400).json({ error: "Este usuário já está cadastrado sob outro indicador." });
          }
          
          await withTransaction(async () => {
            await db.prepare("UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?").run(existingUser.id, existingUser.id, voucherId);
            const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
            await NotificationManager.createNotification(existingUser.id, 'VOUCHER_RECEIVED', message);
          });
        } else {
          await db.prepare("UPDATE vouchers SET status = 'SENT', recipient_email = ? WHERE id = ?").run(recipientEmail, voucherId);

          const emailSubject = `🎁 Você recebeu um presente de ${sender.name}!`;
          const emailBody = `Olá!\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${ruleMessage}\n\nApós o cadastro, seu voucher estará disponível na sua conta.\n\nEquipe Mobicyclo`;
          await sendNotificationEmail(recipientEmail, emailSubject, emailBody);
        }
      } else if (recipientPhone) {
        const existingUser = await db.prepare("SELECT id, referrer_id FROM users WHERE phone = ?").get(recipientPhone) as any;
        
        if (existingUser) {
          if (existingUser.referrer_id !== req.user.id) {
            return res.status(400).json({ error: "Este usuário já está cadastrado sob outro indicador." });
          }
          
          await withTransaction(async () => {
            await db.prepare("UPDATE vouchers SET owner_id = ?, recipient_id = ?, status = 'SENT' WHERE id = ?").run(existingUser.id, existingUser.id, voucherId);
            const message = `Você recebeu um voucher de R$ ${voucher.amount.toFixed(2)} de ${sender.name}! 🎁\n\n${ruleMessage}\n\nSeu link de cadastro do indicador: ${registrationLink}`;
            await NotificationManager.createNotification(existingUser.id, 'VOUCHER_RECEIVED', message);
          });
        } else {
          await db.prepare("UPDATE vouchers SET status = 'SENT', recipient_phone = ? WHERE id = ?").run(recipientPhone, voucherId);
        }

        const waMessage = `Olá! 🎁\n\n${sender.name} enviou um voucher de presente no valor de R$ ${voucher.amount.toFixed(2)} para você usar no app de mobilidade Mobicyclo!\n\nPara resgatar seu presente, você precisa se cadastrar como um indicado direto de ${sender.name} usando o link abaixo:\n\n${registrationLink}\n\n${ruleMessage}\n\nApós o cadastro, seu voucher estará disponível na sua conta.`;
        const waUrl = `https://wa.me/${recipientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(waMessage)}`;
        return res.json({ success: true, whatsappUrl: waUrl });
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error in /api/vouchers/send:", err);
      res.status(500).json({ error: "Erro ao enviar voucher" });
    }
  });

  app.get("/api/rankings", authenticateUser, async (req, res) => {
    try {
      const topReferrers = await db.prepare(`
        SELECT id, name, nickname, avatar, referrals_count as referralsCount 
        FROM users 
        WHERE referrals_count > 0 
        ORDER BY referrals_count DESC 
        LIMIT 10
      `).all();

      const topCyclers = await db.prepare(`
        SELECT u.id, u.name, u.nickname, u.avatar, COUNT(mc.id) as cycleCount 
        FROM users u
        JOIN matrix_cycles mc ON u.id = mc.user_id
        GROUP BY u.id
        ORDER BY cycleCount DESC
        LIMIT 10
      `).all();

      res.json({ topReferrers, topCyclers });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar rankings" });
    }
  });

  app.get("/api/user/achievements", authenticateUser, async (req: any, res) => {
    try {
      const badges = await db.prepare("SELECT * FROM badges WHERE user_id = ?").all(req.user.id);
      res.json(badges);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar conquistas" });
    }
  });

  app.get("/api/user/progress", authenticateUser, async (req: any, res) => {
    try {
      const user = await db.prepare("SELECT referrals_count, career_level, cycle_sales_count FROM users WHERE id = ?").get(req.user.id) as any;
      const cycleCount = await db.prepare("SELECT COUNT(*) as count FROM matrix_cycles WHERE user_id = ?").get(req.user.id) as any;
      
      const milestones = [
        { count: 2, level: 'BRONZE' },
        { count: 5, level: 'SILVER' },
        { count: 10, level: 'GOLD' },
        { count: 50, level: 'EMERALD' },
        { count: 100, level: 'DIAMOND' },
        { count: 1000, level: 'DOUBLE_DIAMOND' },
        { count: 10000, level: 'BLACK_DIAMOND' },
        { count: 100000, level: 'ROYAL_BLACK_DIAMOND' }
      ];

      const nextMilestone = milestones.find(m => m.count > user.referrals_count);
      const currentMilestone = [...milestones].reverse().find(m => m.count <= user.referrals_count) || { count: 0, level: 'NONE' };

      res.json({
        referrals: user.referrals_count,
        cycles: cycleCount.count,
        networkSales: user.cycle_sales_count,
        currentLevel: user.career_level,
        nextMilestone,
        currentMilestone,
        progressToNext: nextMilestone ? ((user.referrals_count - currentMilestone.count) / (nextMilestone.count - currentMilestone.count)) * 100 : 100
      });
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar progresso" });
    }
  });

  app.get("/api/user/matrix/:targetId", authenticateUser, async (req: any, res) => {
    try {
      const { targetId } = req.params;
      const isAdmin = isUserAdmin(req.user);

      let matrices;
      if (isAdmin) {
        matrices = await db.prepare(`
          SELECT DISTINCT m.* 
          FROM matrices m 
          JOIN matrix_positions mp ON m.id = mp.matrix_id 
          WHERE m.status = 'OPEN' AND mp.user_id = ?
        `).all(targetId);
      } else {
        matrices = await db.prepare(`
          SELECT DISTINCT m.* 
          FROM matrices m 
          JOIN matrix_positions mp_target ON m.id = mp_target.matrix_id 
          JOIN matrix_positions mp_requester ON m.id = mp_requester.matrix_id
          WHERE m.status = 'OPEN' 
          AND mp_target.user_id = ? 
          AND mp_requester.user_id = ?
        `).all(targetId, req.user.id);
      }

      if (matrices.length === 0) {
        return res.json([]);
      }

      let allPositions: any[] = [];
      if (isAdmin) {
        allPositions = await db.prepare(`
          SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.avatar
          FROM matrix_positions mp 
          JOIN users u ON mp.user_id = u.id 
          JOIN matrices m ON mp.matrix_id = m.id
          WHERE m.status = 'OPEN' AND mp.matrix_id IN (
            SELECT m2.id FROM matrices m2 
            JOIN matrix_positions mp2 ON m2.id = mp2.matrix_id 
            WHERE m2.status = 'OPEN' AND mp2.user_id = ?
          )
        `).all(targetId);
      } else {
        allPositions = await db.prepare(`
          SELECT mp.matrix_id, mp.position, mp.user_id as userId, u.name as name, u.nickname as nickname, u.referrals_count as referralsCount, u.status as status, u.career_level as careerLevel, u.balance as balance, u.avatar
          FROM matrix_positions mp 
          JOIN users u ON mp.user_id = u.id 
          WHERE mp.matrix_id IN (
            SELECT m2.id FROM matrices m2 
            JOIN matrix_positions mp_target ON m2.id = mp_target.matrix_id 
            JOIN matrix_positions mp_requester ON m2.id = mp_requester.matrix_id
            WHERE m2.status = 'OPEN' AND mp_target.user_id = ? AND mp_requester.user_id = ?
          )
        `).all(targetId, req.user.id);
      }

      const result = matrices.map((m: any) => {
        const positions = allPositions.filter((p: any) => p.matrix_id === m.id).map((p: any) => ({
          ...p,
          userName: p.name,
          userNickname: p.nickname,
          status: p.status,
          careerLevel: p.careerLevel,
          balance: p.balance,
          avatar: p.avatar
        }));
        return { ...m, positions };
      });

      const uniqueResult = Array.from(new Map(result.map((m: any) => [m.id, m]) as any).values());

      res.json(uniqueResult);
    } catch (err) {
      console.error("Error in /api/user/matrix/:targetId:", err);
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.get("/api/admin/user/network/:userId", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { userId } = req.params;
      const maxDepth = Math.min(parseInt(req.query.depth as string) || 10, 15);

      const getNetwork = async (id: string, depth = 0): Promise<any> => {
        if (depth >= maxDepth) return [];

        const directReferrals = await db.prepare(`
          SELECT id, name, nickname, status, career_level as careerLevel, avatar, referrals_count as referralsCount, created_at as createdAt 
          FROM users 
          WHERE referrer_id = ?
        `).all(id) as any[];

        const results = [];
        for (const ref of directReferrals) {
          const matrixPos = await db.prepare(`
            SELECT m.type, mp.position 
            FROM matrix_positions mp 
            JOIN matrices m ON mp.matrix_id = m.id 
            WHERE mp.user_id = ? AND m.status = 'OPEN'
            LIMIT 1
          `).get(ref.id) as any;

          results.push({
            ...ref,
            matrixType: matrixPos?.type || null,
            matrixPosition: matrixPos?.position || null,
            children: await getNetwork(ref.id, depth + 1)
          });
        }
        return results;
      };

      const network = await getNetwork(userId);
      res.json(network);
    } catch (err) {
      console.error("Error in /api/admin/user/network:", err);
      res.status(500).json({ error: "Erro ao buscar rede do usuário" });
    }
  });

  app.get("/api/user/network", authenticateUser, async (req: any, res) => {
    try {
      const maxDepth = Math.min(parseInt(req.query.depth as string) || 10, 15);

      const getNetwork = async (id: string, depth = 0): Promise<any> => {
        if (depth >= maxDepth) return null;

        const directReferrals = await db.prepare(`
          SELECT id, name, nickname, status, avatar, referrals_count as referralsCount, created_at as createdAt 
          FROM users 
          WHERE referrer_id = ?
        `).all(id);

        const results = [];
        for (const ref of directReferrals) {
          const matrixPos = await db.prepare(`
            SELECT m.type, mp.position 
            FROM matrix_positions mp 
            JOIN matrices m ON mp.matrix_id = m.id 
            WHERE mp.user_id = ? AND m.status = 'OPEN'
            LIMIT 1
          `).get((ref as any).id) as any;

          results.push({
            ...ref,
            matrixType: matrixPos?.type || null,
            matrixPosition: matrixPos?.position || null,
            children: await getNetwork((ref as any).id, depth + 1)
          });
        }
        return results;
      };

      const network = await getNetwork(req.user.id);
      res.json(network);
    } catch (err) {
      res.status(500).json({ error: "Erro ao buscar rede" });
    }
  });

  app.post("/api/admin/clear-image-cache", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const newVersion = Date.now().toString();
      await ensureSetting('image_cache_version', newVersion);
      res.json({ success: true, version: newVersion });
    } catch (err) {
      console.error("Error clearing image cache:", err);
      res.status(500).json({ error: "Erro ao limpar cache de imagens" });
    }
  });

  app.post("/api/admin/transactions/:id/clawback", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const transaction = await db.prepare("SELECT * FROM transactions WHERE id = ?").get(id) as any;
      
      if (!transaction || transaction.type !== 'ADHESION' || transaction.status === 'REJECTED') {
        return res.status(400).json({ error: "Transação inválida para estorno" });
      }

      const buyerId = transaction.user_id;
      const buyer = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(buyerId) as any;
      
      if (!buyer) return res.status(404).json({ error: "Comprador não encontrado" });

      await db.prepare("UPDATE transactions SET status = 'REJECTED', description = 'Estornada pelo Administrador' WHERE id = ?").run(id);

      let currentReferrerId = buyer.referrer_id;
      const visited = new Set<string>();
      
      if (currentReferrerId) {
        await db.prepare("UPDATE users SET cycle_sales_count = GREATEST(0, cycle_sales_count - 1) WHERE id = ?").run(currentReferrerId);
        await NotificationManager.createNotification(currentReferrerId, 'CLAWBACK', 'Uma venda direta foi estornada. -1 ponto no ciclo vigente.');
      }

      for (let level = 1; level <= 8; level++) {
        if (!currentReferrerId || visited.has(currentReferrerId)) break;
        visited.add(currentReferrerId);

        const upline = await db.prepare("SELECT id, balance, debt_balance FROM users WHERE id = ?").get(currentReferrerId) as any;
        if (!upline) break;

        let commissionToClawback = 0;
        if (level === 1) commissionToClawback = 150;
        else {
          const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
          commissionToClawback = adhesionFee * 0.04;
        }

        let newBalance = upline.balance;
        let newDebtBalance = upline.debt_balance;

        if (newBalance >= commissionToClawback) {
          newBalance -= commissionToClawback;
        } else {
          newDebtBalance += (commissionToClawback - newBalance);
          newBalance = 0;
        }

        await db.prepare("UPDATE users SET balance = ?, debt_balance = ? WHERE id = ?").run(newBalance, newDebtBalance, upline.id);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CLAWBACK', 'Estorno de Comissão (Rede)', 'COMPLETED')").run(
          generateId("tx"), upline.id, -commissionToClawback
        );

        await NotificationManager.createNotification(upline.id, 'CLAWBACK', `Estorno de comissão processado (R$ ${commissionToClawback.toFixed(2)}).`);

        const next = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentReferrerId) as any;
        currentReferrerId = next?.referrer_id;
      }

      res.json({ success: true });
    } catch (err) {
      console.error("Error in clawback:", err);
      res.status(500).json({ error: "Erro ao processar estorno" });
    }
  });

  app.get("/api/admin/stats", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const totalUsers = ((await db.prepare("SELECT COUNT(*) as count FROM users").get()) as any).count;
      const totalBalance = ((await db.prepare("SELECT SUM(balance) as sum FROM users").get()) as any).sum || 0;
      const totalCashback = ((await db.prepare("SELECT SUM(cashback_balance) as sum FROM users").get()) as any).sum || 0;
      const totalTransactions = ((await db.prepare("SELECT COUNT(*) as count FROM transactions").get()) as any).count;
      const activeMatrices = ((await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE status = 'OPEN'").get()) as any).count;
      const onBoardMatrices = ((await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN'").get()) as any).count;
      const cashBoardMatrices = ((await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE type = 'CASHBOARD' AND status = 'OPEN'").get()) as any).count;
      
      const cycles = ((await db.prepare("SELECT COUNT(*) as count FROM transactions WHERE type IN ('BONUS', 'CASHBACK') AND description LIKE '%Ciclo%'").get()) as any).count;
      
      const flowEconomySetting = await db.prepare("SELECT value FROM settings WHERE `key` = 'flow_economy'").get() as any;
      const flowEconomy = parseFloat(flowEconomySetting?.value || '0');

      const totalRevenue = ((await db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED'").get()) as any).sum || 0;
      const totalBonusPaid = ((await db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE type = 'BONUS' AND status = 'COMPLETED'").get()) as any).sum || 0;
      
      const totalTaxes = totalRevenue * 0.075;
      
      const totalSnackCashback = ((await db.prepare("SELECT SUM(snack_fast_cashback) as sum FROM users").get()) as any).sum || 0;
      const totalEnergyCashback = ((await db.prepare("SELECT SUM(energy_cashback) as sum FROM users").get()) as any).sum || 0;
      const totalGuinchoCashback = ((await db.prepare("SELECT SUM(guincho_cashback) as sum FROM users").get()) as any).sum || 0;
      const totalHabilityCashback = ((await db.prepare("SELECT SUM(hability_test_cashback) as sum FROM users").get()) as any).sum || 0;
      
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
      const activeUsers = ((await db.prepare("SELECT COUNT(DISTINCT user_id) as count FROM transactions WHERE created_at > ?").get(thirtyDaysAgo)) as any).count;

      const growthData = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const count = ((await db.prepare("SELECT COUNT(*) as count FROM users WHERE created_at LIKE ?").get(`${date}%`)) as any).count;
        growthData.push({ date, count });
      }

      const revenueHistory = [];
      for (let i = 6; i >= 0; i--) {
        const date = new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
        const amount = ((await db.prepare("SELECT SUM(amount) as sum FROM transactions WHERE type = 'ADHESION' AND status = 'COMPLETED' AND created_at LIKE ?").get(`${date}%`)) as any).sum || 0;
        revenueHistory.push({ date, amount });
      }

      res.json({
        totalUsers, activeUsers, totalBalance, totalCashback,
        totalSnackCashback, totalEnergyCashback, totalGuinchoCashback, totalHabilityCashback,
        totalTransactions, activeMatrices, onBoardMatrices, cashBoardMatrices,
        cycles, flowEconomy, totalRevenue, totalBonusPaid, totalTaxes,
        growthData, revenueHistory
      });
    } catch (err) {
      console.error("Stats error:", err);
      res.status(500).json({ error: "Erro ao buscar estatísticas" });
    }
  });

  app.get("/api/admin/users", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = (req.query.search as string) || "";
      const offset = (page - 1) * limit;

      let countQuery = "SELECT COUNT(*) as count FROM users";
      let usersQuery = `
        SELECT 
          id, name, nickname, email, cpf, phone, 
          pix_key as pixKey, birth_date as birthDate, avatar, 
          referrals_count as referralsCount, balance, 
          debt_balance as debtBalance, cashback_balance, 
          snack_fast_cashback, energy_cashback, guincho_cashback, hability_test_cashback,
          voucher_balance as voucherBalance, document_status as documentStatus, 
          stars, status, career_level as careerLevel,
          referral_code as referralCode, reentry_mode as reentryMode
        FROM users 
      `;

      const params: any[] = [];
      if (search) {
        const searchClause = " WHERE name LIKE ? OR email LIKE ? OR id LIKE ? OR nickname LIKE ? ";
        countQuery += searchClause;
        usersQuery += searchClause;
        const searchParam = `%${search}%`;
        params.push(searchParam, searchParam, searchParam, searchParam);
      }

      usersQuery += " ORDER BY created_at DESC LIMIT ? OFFSET ? ";
      
      const totalCount = ((await db.prepare(countQuery).get(...params)) as any).count;
      const users = await db.prepare(usersQuery).all(...params, limit, offset);

      res.json({ users, total: totalCount, page, limit });
    } catch (err) {
      console.error("Error in /api/admin/users:", err);
      res.status(500).json({ error: "Erro interno ao buscar usuários" });
    }
  });

  app.post("/api/admin/users/:id/status", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      await db.prepare("UPDATE users SET status = ? WHERE id = ?").run(status, id);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: "Erro interno" });
    }
  });

  app.post("/api/admin/users/:id/update", authenticateUser, authorizeAdmin, catchAsync(async (req, res) => {
    const { id } = req.params;
    const { field, value } = req.body;
    
    const allowedFields = [
      'name', 'email', 'phone', 'cpf', 'nickname', 'birth_date', 'pix_key',
      'balance', 'cashback_balance', 'snack_fast_cashback', 'energy_cashback', 
      'guincho_cashback', 'hability_test_cashback', 'voucher_balance', 
      'document_status', 'stars', 'status', 'career_level', 'role', 'is_activated'
    ];

    if (!allowedFields.includes(field)) {
      return res.status(400).json({ error: "Campo não permitido para edição" });
    }

    await db.prepare(`UPDATE users SET ${field} = ? WHERE id = ?`).run(value, id);
    
    logger.info(`[Admin] Usuário ${id} atualizado por ${req.user.id}: ${field} -> ${value}`);
    res.json({ success: true });
  }));

  app.delete("/api/admin/users/:id", authenticateUser, authorizeAdmin, catchAsync(async (req: any, res) => {
    const id = req.params.id?.trim();
    if (!id) {
      return res.status(400).json({ error: "ID obrigatório" });
    }
    if (id === req.user.id) {
      return res.status(400).json({ error: "Não é possível excluir o próprio usuário logado." });
    }

    const target = (await db
      .prepare("SELECT id, email, role FROM users WHERE id = ?")
      .get(id)) as { id: string; email: string | null; role: string | null } | null;
    if (!target) {
      return res.status(404).json({ error: "Usuário não encontrado" });
    }
    const email = (target.email || "").toLowerCase();
    if (target.role === "admin" || email === "consultorcredenciado@gmail.com") {
      return res.status(403).json({ error: "Não é permitido excluir conta de administrador." });
    }
    if (id.startsWith("sys_")) {
      return res.status(403).json({ error: "Não é permitido excluir usuários de sistema." });
    }

    await withTransaction(async () => {
      await db.prepare("UPDATE users SET referrer_id = NULL WHERE referrer_id = ?").run(id);
      await db.prepare("DELETE FROM user_badges WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM badges WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM matrix_history WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM matrix_cycles WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM matrix_positions WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM notifications WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM transactions WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM documents WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM mercadopago_deposit_orders WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM license_checkouts WHERE user_id = ?").run(id);
      await db.prepare("DELETE FROM vouchers WHERE owner_id = ? OR recipient_id = ?").run(id, id);
      await db.prepare("DELETE FROM users WHERE id = ?").run(id);
    });

    logger.info(`[Admin] Usuário ${id} excluído por ${req.user.id}`);
    res.json({ success: true });
  }));

  app.get("/api/admin/transactions", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const transactions = await db.prepare(`
        SELECT 
          t.id, t.user_id as userId, t.amount, t.type, 
          t.description, t.status, t.created_at as createdAt, 
          u.name as userName, u.email as userEmail 
        FROM transactions t 
        JOIN users u ON t.user_id = u.id 
        ORDER BY t.created_at DESC 
        LIMIT 100
      `).all();
      res.json(transactions);
    } catch (err) {
      console.error("Error in /api/admin/transactions:", err);
      res.status(500).json({ error: "Erro interno ao buscar transações" });
    }
  });

  app.post("/api/admin/reset-all", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      console.log(`DEBUG: [POST /api/admin/reset-all] Full system reset requested`);
      const result = await UserManager.resetSystem();
      if (!result.success) {
        return res.status(500).json({ error: result.error || "Erro interno ao resetar sistema" });
      }
      res.json({ success: true, message: "Sistema resetado com sucesso!" });
    } catch (err: any) {
      console.error("Error in /api/admin/reset-all:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor ao resetar" });
    }
  });

  app.post("/api/admin/clear-ghosts", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      console.log("DEBUG: Clearing ghost entries...");
      await withTransaction(async () => {
        await db.prepare(`
          DELETE FROM matrix_positions 
          WHERE (user_id = 'sys_explosion' OR user_id = 'sys_admin_001') 
          AND position IN (4, 5, 6, 7)
        `).run();
        
        await db.prepare(`
          DELETE FROM matrix_history 
          WHERE (user_id = 'sys_explosion' OR user_id = 'sys_admin_001') 
          AND position IN (4, 5, 6, 7)
        `).run();
      });

      res.json({ success: true, message: "Entradas fantasmas removidas com sucesso!" });
    } catch (err) {
      console.error("Error in /api/admin/clear-ghosts:", err);
      res.status(500).json({ error: "Erro interno do servidor ao limpar fantasmas" });
    }
  });

  app.post("/api/admin/seed", authenticateUser, authorizeAdmin, async (req, res) => {
    const result = await UserManager.resetSystem();
    if (result.success) {
      res.json({ success: true });
    } else {
      res.status(500).json({ error: result.error });
    }
  });

  // Ensure system users and initial matrices exist
  try {
    UserManager.ensureSystemUsers();
    await MatrixManager.seedInitialMatrices();

    const RESET_KEY_V19 = 'matrix_reset_v19';
    const alreadyResetV19 = await db.prepare("SELECT value FROM settings WHERE `key` = ?").get(RESET_KEY_V19);
    if (!alreadyResetV19) {
      console.log("DEBUG: Performing one-time matrix reset (v19)...");
      try {
        const result = await UserManager.resetSystem();
        if (result.success) {
          await db.prepare("INSERT IGNORE INTO settings (`key`, value) VALUES (?, 'true')").run(RESET_KEY_V19);
          console.log("DEBUG: One-time reset v19 completed.");
        }
      } catch (err) {
        console.error("Error during one-time reset v19:", err);
      }
    }
    
    UserManager.ensureSystemUsers();
  } catch (err) {
    console.error("CRITICAL: Error during system initialization:", err);
  }

  app.post("/api/admin/force-reset", authenticateUser, authorizeAdmin, async (req, res) => {
    try {
      const result = await UserManager.resetSystem();
      if (result.success) {
        res.json({ success: true, message: "Sistema resetado com sucesso!" });
      } else {
        res.status(500).json({ error: result.error || "Erro ao resetar sistema" });
      }
    } catch (err: any) {
      console.error("Error in /api/admin/force-reset:", err);
      res.status(500).json({ error: err.message || "Erro interno do servidor" });
    }
  });

  app.get("/api/generate-logo", authenticateUser, authorizeAdmin, async (req, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = "A modern and minimalist logo for an app called 'Mobicyclo'. The central symbol is a stylized, floating coin in glowing neon green. In the center of the coin, instead of a dollar sign ($), there is a curved arrow wrapping around the edge (indicating cashback) that subtly connects to waves resembling a Wi-Fi signal or map routes in light blue. The background is a deep navy blue or graphite. The typography for the app name 'Mobicyclo' should be modern, sans-serif, rounded, and clean.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let imagePartFound = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data as string, "base64");
          const outputPath = path.join(__dirname, "public/logo.png");
          const fs = await import("fs");
          fs.writeFileSync(outputPath, buffer);
          imagePartFound = true;
          break;
        }
      }

      if (imagePartFound) {
        res.json({ success: true, message: "Logo generated and saved to public/logo.png" });
      } else {
        res.status(500).json({ error: "No image part found in the response." });
      }
    } catch (error) {
      res.status(500).json({ error: error instanceof Error ? error.message : "Unknown error" });
    }
  });

  // Produção: serve os arquivos estáticos do frontend
  const isProd = process.env.NODE_ENV === "production";
  if (isProd) {
    console.log("Starting in PRODUCTION mode");
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  } else {
    console.log("Starting in DEVELOPMENT mode with Vite middleware");
    const viteModule = await import("vite");
    const vite = await viteModule.createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.post("/api/admin/generate-logo", authenticateUser, authorizeAdmin, async (req: any, res) => {
    try {
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(500).json({ error: "GEMINI_API_KEY is not set." });
      }

      const { GoogleGenAI } = await import("@google/genai");
      const ai = new GoogleGenAI({ apiKey });
      const prompt = "A modern and minimalist logo for an app called 'MOBICYCLE'. The central symbol is a stylized, floating coin in glowing neon green. In the center of the coin, instead of a dollar sign ($), there is a curved arrow wrapping around the edge (indicating cashback) that subtly connects to waves resembling a Wi-Fi signal or map routes in light blue. The background is a deep navy blue or graphite. The typography for the app name 'MOBICYCLE' should be modern, sans-serif, rounded, and clean.";

      console.log("Generating logo via API...");
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let imagePartFound = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data, "base64");
          const outputPath = path.join(__dirname, "public/logo.png");
          
          const fs = await import("fs");
          if (!fs.existsSync(path.join(__dirname, "public"))) {
            fs.mkdirSync(path.join(__dirname, "public"));
          }
          
          fs.writeFileSync(outputPath, buffer);
          console.log(`Logo saved to ${outputPath}`);
          imagePartFound = true;
          break;
        }
      }

      if (imagePartFound) {
        res.json({ success: true, message: "Logo generated and saved successfully." });
      } else {
        res.status(500).json({ error: "Failed to generate logo: No image returned." });
      }
    } catch (err: any) {
      console.error("Error generating logo:", err);
      res.status(500).json({ error: err.message || "Failed to generate logo" });
    }
  });

  app.get("/api/generate-logo", authenticateUser, authorizeAdmin, async (req: any, res) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "GEMINI_API_KEY is not set." });
    }

    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });
    const prompt = "A modern and minimalist logo for an app called 'MOBICYCLE'. The central symbol is a stylized, floating coin in glowing neon green. In the center of the coin, instead of a dollar sign ($), there is a curved arrow wrapping around the edge (indicating cashback) that subtly connects to waves resembling a Wi-Fi signal or map routes in light blue. The background is a deep navy blue or graphite. The typography for the app name 'MOBICYCLE' should be modern, sans-serif, rounded, and clean.";

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-image",
        contents: [{ parts: [{ text: prompt }] }],
        config: {
          imageConfig: {
            aspectRatio: "1:1",
            imageSize: "1K"
          }
        }
      });

      let imagePartFound = false;
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          const base64Data = part.inlineData.data;
          const buffer = Buffer.from(base64Data, "base64");
          const outputPath = path.join(__dirname, "public/logo.png");
          const fs = await import("fs");
          fs.writeFileSync(outputPath, buffer);
          imagePartFound = true;
          break;
        }
      }

      if (imagePartFound) {
        res.json({ success: true, message: "Logo generated and saved successfully." });
      } else {
        res.status(500).json({ error: "Failed to generate logo: No image returned." });
      }
    } catch (err: any) {
      console.error("Error generating logo:", err);
      res.status(500).json({ error: err.message || "Failed to generate logo" });
    }
  });

  // S09: DEVELOPER.md endpoint removed for security — was exposing internal docs publicly
  
  // Middleware de erro centralizado (DEVE ser o último)
  app.use(errorHandler);

  app.listen(PORT, "0.0.0.0", () => {
    logger.info(`Server running on http://0.0.0.0:${PORT} in ${process.env.NODE_ENV || 'development'} mode`);
  });
}

startServer().catch(err => {
  logger.error('Critical failure during server startup:', err);
});
