import { db, generateId, getSetting, withTransaction } from '../config/db.ts';
import logger from '../utils/logger.ts';
import { NotificationManager } from './notification_manager.ts';
import { AchievementManager } from './achievement_manager.ts';
import { FinancialManager } from './financial_manager.ts';

export class MatrixManager {
  static async createMatrix(type: 'ONBORD' | 'CASHBOARD') {
    const id = generateId("matrix");
    await db.prepare("INSERT INTO matrices (id, type, status) VALUES (?, ?, 'OPEN')").run(id, type);
    return { id, type };
  }

  static async splitMatrix(matrixId: string) {
    try {
      const matrix = await db.prepare("SELECT type FROM matrices WHERE id = ?").get(matrixId) as any;
      if (!matrix) return;
      const type = matrix.type as 'ONBORD' | 'CASHBOARD';
      logger.info(`Splitting ${type} matrix ${matrixId}...`);

      const occupants = await db.prepare("SELECT user_id, position FROM matrix_positions WHERE matrix_id = ?").all(matrixId) as any[];
      await db.prepare("UPDATE matrices SET status = 'CLOSED' WHERE id = ?").run(matrixId);

      const matrixA = await this.createMatrix(type);
      const matrixB = await this.createMatrix(type);

      const pos2 = occupants.find(o => o.position === 2);
      const pos3 = occupants.find(o => o.position === 3);
      const pos4 = occupants.find(o => o.position === 4);
      const pos5 = occupants.find(o => o.position === 5);
      const pos6 = occupants.find(o => o.position === 6);
      const pos7 = occupants.find(o => o.position === 7);

      const ensureUserExists = async (uid: string) => {
        const exists = await db.prepare("SELECT id FROM users WHERE id = ?").get(uid);
        if (!exists) {
          logger.error(`[splitMatrix] User ${uid} NOT FOUND!`);
        }
      };

      if (pos2) { await ensureUserExists(pos2.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixA.id, pos2.user_id, 1); }
      if (pos3) { await ensureUserExists(pos3.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixB.id, pos3.user_id, 1); }
      if (pos4) { await ensureUserExists(pos4.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixA.id, pos4.user_id, 2); }
      if (pos5) { await ensureUserExists(pos5.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixA.id, pos5.user_id, 3); }
      if (pos6) { await ensureUserExists(pos6.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixB.id, pos6.user_id, 2); }
      if (pos7) { await ensureUserExists(pos7.user_id); await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixB.id, pos7.user_id, 3); }

      const formationRule = await getSetting('matrix_formation_rule', 'FILL_BASE');
      if (formationRule === 'JUMP' || type === 'ONBORD') {
        await this.reorderMatrixByReferrals(matrixA.id);
        await this.reorderMatrixByReferrals(matrixB.id);
      }

      logger.info(`${type} Matrix ${matrixId} split into ${matrixA.id} and ${matrixB.id}`);
    } catch (err) {
      logger.error("Error in splitMatrix:", err);
    }
  }

  static async processUserCycle(matrixId: string, userId: string, matrixType: string, depth = 0): Promise<{ success?: boolean, error?: string, cycleInfo?: any }> {
    try {
      logger.info(`User ${userId} is cycling out of ${matrixType} matrix ${matrixId}`);
      let cycleInfo = null;

      if (matrixType === 'ONBORD') {
        await db.prepare("INSERT INTO matrix_cycles (id, user_id, matrix_id, type, amount) VALUES (?, ?, ?, ?, ?)").run(
          generateId("cycle"), userId, matrixId, 'ONBORD', 0
        );

        await NotificationManager.createNotification(userId, 'ONBORD_CYCLE', `Você ciclou no On-Board e avançou para o Cash-Board!`);

        const formationRule = await getSetting('matrix_formation_rule', 'FILL_BASE');
        let cashBoard = null;

        if (formationRule === 'FOLLOW_REFERRER') {
          const u = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
          if (u && u.referrer_id) {
            const referrerMatrix = await db.prepare(`
              SELECT m.id 
              FROM matrices m 
              JOIN matrix_positions mp ON m.id = mp.matrix_id 
              WHERE mp.user_id = ? AND m.type = 'CASHBOARD' AND m.status = 'OPEN'
              LIMIT 1
            `).get(u.referrer_id) as any;
            if (referrerMatrix) cashBoard = referrerMatrix;
          }
        }

        if (!cashBoard) {
          const openCashBoards = await db.prepare("SELECT id FROM matrices WHERE type = 'CASHBOARD' AND status = 'OPEN' ORDER BY created_at ASC").all() as any[];
          cashBoard = openCashBoards.length > 0 ? openCashBoards[0] : null;
        }

        if (!cashBoard) {
          cashBoard = await this.createMatrix('CASHBOARD');
        }
        
        const recursiveResult = await this.fillPosition(cashBoard.id, userId, depth + 1);
        if (recursiveResult.error) {
          logger.error("Error in recursive fillPosition:", recursiveResult.error);
          throw new Error(recursiveResult.error);
        }
        if (recursiveResult.cycleInfo) cycleInfo = recursiveResult.cycleInfo;
      } else {
        const user = await db.prepare("SELECT * FROM users WHERE id = ?").get(userId) as any;
        if (user) {
          let baseBonus = 0;
          let isQualified = false;
          
          const cashboardBonus = parseFloat(await getSetting('matrix_cashboard_bonus', '3990'));
          if (user.referrals_count >= 2) {
            baseBonus = cashboardBonus;
            isQualified = true;
          } else if (user.referrals_count === 1) {
            baseBonus = cashboardBonus / 2;
            isQualified = true;
          }

          if (isQualified) {
            const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
            const reentryAmount = adhesionFee;
            const netBonus = baseBonus - reentryAmount;
            
            const cashbackAmount = baseBonus * 0.10;
            const wayfySnackAmount = baseBonus * 0.05;

            cycleInfo = { userId: userId, type: 'CASHBOARD_CYCLE', amount: netBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) };
            await db.prepare("INSERT INTO matrix_cycles (id, user_id, matrix_id, type, amount) VALUES (?, ?, ?, ?, ?)").run(
              generateId("cycle"), userId, matrixId, 'CASHBOARD', netBonus
            );

            await db.prepare(`
              UPDATE users 
              SET balance = balance + ?, 
                  cashback_balance = cashback_balance + ?, 
                  snack_fast_cashback = snack_fast_cashback + ?,
                  total_earnings = total_earnings + ? 
              WHERE id = ?
            `).run(netBonus, cashbackAmount, wayfySnackAmount, baseBonus, user.id);

            const bonusDescription = 'Ciclo Cash-Board (Líquido - Reentrada Automática)';
            await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
              generateId("tx"), user.id, netBonus, bonusDescription
            );

            if (cashbackAmount > 0) {
              await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', 'Cashback Ciclo (10%)', 'COMPLETED')").run(
                generateId("tx"), user.id, cashbackAmount
              );
            }
            if (wayfySnackAmount > 0) {
              await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', 'Mobicyclo Snack Cashback Ciclo (5%)', 'COMPLETED')").run(
                generateId("tx"), user.id, wayfySnackAmount
              );
            }
            
            await db.prepare("UPDATE users SET cycle_sales_count = 0 WHERE id = ?").run(user.id);
            await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'REENTRY', 'Reentrada Automática (Débito Ciclo)', 'COMPLETED')").run(
              generateId("tx"), user.id, -reentryAmount
            );

            await FinancialManager.payInfiniteBonusOnCycle(user.id, baseBonus);

            await NotificationManager.createNotification(user.id, 'BONUS_AVAILABLE', `🏆 Parabéns! Você ciclou do Cash-Board e recebeu R$ ${netBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de bônus e R$ ${(cashbackAmount + wayfySnackAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em cashback! Você retornou automaticamente para a base do On-Board.`);
            await AchievementManager.checkAchievements(user.id);
            
            await this.processReentryInternal(user.id, true);
          } else {
            await NotificationManager.createNotification(user.id, 'CASHBOARD_CYCLE_NO_BONUS', `Você ciclou do Cash-Board, mas não recebeu bônus por não possuir indicações diretas qualificadas. Você retornou para a base do On-Board.`);
            await this.processReentryInternal(user.id, true);
          }
        }
      }

      await this.splitMatrix(matrixId);
      return { success: true, cycleInfo };
    } catch (err) {
      logger.error("Error in processUserCycle:", err);
      throw err;
    }
  }

  static async reorderMatrixByReferrals(matrixId: string) {
    try {
      const usersInMatrix = await db.prepare(`
        SELECT mp.id as pos_id, mp.user_id, u.referrals_count
        FROM matrix_positions mp 
        JOIN users u ON mp.user_id = u.id 
        WHERE mp.matrix_id = ?
        ORDER BY u.referrals_count DESC, mp.id ASC
      `).all(matrixId) as any[];

      await withTransaction(async () => {
        for (let i = 0; i < usersInMatrix.length; i++) {
          await db.prepare("UPDATE matrix_positions SET position = ? WHERE id = ?").run(-(i + 1), usersInMatrix[i].pos_id);
        }
        for (let i = 0; i < usersInMatrix.length; i++) {
          await db.prepare("UPDATE matrix_positions SET position = ? WHERE id = ?").run(i + 1, usersInMatrix[i].pos_id);
        }
      });
      logger.info(`Matrix ${matrixId} reordered by referrals.`);
    } catch (err) {
      logger.error("Error in reorderMatrixByReferrals:", err);
    }
  }

  static async fillPosition(matrixId: string, userId: string, depth = 0, isReentry = false): Promise<{ success?: boolean, error?: string, message?: string, cycleInfo?: any }> {
    const startTime = Date.now();
    try {
      if (depth > 10) {
        logger.error(`Max recursion depth reached in fillPosition for user ${userId} in matrix ${matrixId}`);
        return { error: "Recursão excessiva detectada no processamento da matriz" };
      }
      
      logger.info(`fillPosition called for user ${userId} in matrix ${matrixId} (depth: ${depth})`);
      
      let cycleInfo: { userId: string; type: string; amount: string } | null = null;
      const matrix = await db.prepare("SELECT type, status FROM matrices WHERE id = ?").get(matrixId) as any;
      if (!matrix) return { error: "Matriz não encontrada" };
      if (matrix.status !== 'OPEN') return { error: "Matriz já está fechada" };
      
      const matrixType = matrix.type;

      const runLogic = async () => {
        const occupants = await db.prepare("SELECT position FROM matrix_positions WHERE matrix_id = ?").all(matrixId) as any[];
        const occupied = new Set(occupants.map(o => o.position));
        
        let targetPos = -1;
        for (let p = 1; p <= 7; p++) {
          if (!occupied.has(p)) {
            targetPos = p;
            break;
          }
        }

        if (targetPos === -1) return { error: "Matriz cheia" };

        const userExists = await db.prepare("SELECT id FROM users WHERE id = ?").get(userId);
        if (!userExists) {
          logger.error(`User ${userId} does not exist. Cannot fill matrix position.`);
          return { error: `Usuário ${userId} não existe` };
        }

        await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, ?)").run(matrixId, userId, targetPos);
        await db.prepare("INSERT INTO matrix_history (id, matrix_id, user_id, type, position) VALUES (?, ?, ?, ?, ?)").run(
          generateId("hist"), matrixId, userId, matrixType, targetPos
        );

        if (matrixType === 'ONBORD') {
          await FinancialManager.payOnboardBonus(userId, isReentry);
        }

        if (targetPos === 7) {
          const topUser = await db.prepare("SELECT user_id FROM matrix_positions WHERE matrix_id = ? AND position = 1").get(matrixId) as any;
          if (topUser) {
            logger.info(`User ${topUser.user_id} reached position 1 and is cycling out of ${matrixType} matrix ${matrixId}`);
            await db.prepare("DELETE FROM matrix_positions WHERE matrix_id = ? AND user_id = ?").run(matrixId, topUser.user_id);
            const cycleResult = await this.processUserCycle(matrixId, topUser.user_id, matrixType, depth);
            if (cycleResult.cycleInfo) cycleInfo = cycleResult.cycleInfo;
          }
        }
        
        logger.info(`fillPosition completed for user ${userId} in ${Date.now() - startTime}ms`);
        return { success: true, cycleInfo };
      };

      if (db.inTransaction) {
        return await runLogic();
      } else {
        let result: any;
        await withTransaction(async () => {
          result = await runLogic();
        });
        return result;
      }
    } catch (err) {
      logger.error("Error in fillPosition:", err);
      throw err;
    }
  }

  static async processReentryInternal(userId: string, skipDeduction = false, depth = 0): Promise<{ success?: boolean, error?: string, cycleInfo?: any }> {
    try {
      if (depth > 5) {
        logger.info(`Skipping re-entry for user ${userId} at depth ${depth} to prevent recursion.`);
        return { success: true };
      }
      logger.info(`Processing automatic re-entry for user ${userId} at depth ${depth}`);
      const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
      if (!skipDeduction) {
        const activePosition = await db.prepare("SELECT mp.matrix_id FROM matrix_positions mp JOIN matrices m ON mp.matrix_id = m.id WHERE mp.user_id = ? AND m.status = 'OPEN'").get(userId);
        if (activePosition) {
          return { error: "Você já possui uma posição ativa no sistema. Aguarde o ciclo para reentrar." };
        }

        const user = await db.prepare("SELECT balance FROM users WHERE id = ?").get(userId) as any;
        if (!user || user.balance < adhesionFee) return { error: `Saldo insuficiente para reentrada` };
        await db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(adhesionFee, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'REENTRY', 'Reentrada Automática', 'COMPLETED')").run(
          generateId("tx"), userId, -adhesionFee
        );
      }

      const userRef = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
      if (userRef && userRef.referrer_id) {
        await FinancialManager.addReferralBonus(userRef.referrer_id, userId, true);
      }

      await FinancialManager.payLicenseUnilevelBonus(userId, true);
      await FinancialManager.payInfiniteBonus(userId, adhesionFee, true);

      const formationRule = await getSetting('matrix_formation_rule', 'FILL_BASE');
      let matrix = null;

      if (formationRule === 'FOLLOW_REFERRER') {
        if (userRef && userRef.referrer_id) {
          const referrerMatrix = await db.prepare(`
            SELECT m.id 
            FROM matrices m 
            JOIN matrix_positions mp ON m.id = mp.matrix_id 
            WHERE mp.user_id = ? AND m.type = 'ONBORD' AND m.status = 'OPEN'
            LIMIT 1
          `).get(userRef.referrer_id) as any;
          if (referrerMatrix) matrix = referrerMatrix;
        }
      }

      if (!matrix) {
        const openMatrices = await db.prepare("SELECT id FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN' ORDER BY created_at ASC").all() as any[];
        matrix = openMatrices.length > 0 ? openMatrices[0] : null;
      }

      if (!matrix) {
        matrix = await this.createMatrix('ONBORD');
      }

      const fillResult = await this.fillPosition(matrix.id, userId, depth + 1, true);
      if (fillResult.success) {
        await FinancialManager.incrementNetworkSales(userId);
      }
      return fillResult;
    } catch (err) {
      logger.error("Error in processReentryInternal:", err);
      return { error: "Erro interno ao processar reentrada" };
    }
  }

  static async seedInitialMatrices() {
    try {
      logger.info("Starting seedInitialMatrices...");
      const admin = await db.prepare("SELECT id, email, role FROM users WHERE email = 'consultorcredenciado@gmail.com' OR role = 'admin' LIMIT 1").get() as any;
      
      if (!admin) {
        logger.warn("No admin user found to seed matrices!");
        return;
      }
      
      const adminId = admin.id;
      logger.info(`Found admin user for seeding: ${admin.email} (ID: ${adminId}, Role: ${admin.role})`);

      const onboardCount = (await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE type = 'ONBORD' AND status = 'OPEN'").get() as any).count;
      logger.info(`Current open On-Board matrices: ${onboardCount}`);
      
      if (onboardCount === 0) {
        logger.info(`Seeding initial On-Board matrix...`);
        const m = await this.createMatrix('ONBORD');
        await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, 1)").run(m.id, adminId);
        logger.info(`Initial On-Board matrix created and admin placed in position 1.`);
      }

      const cashboardCount = (await db.prepare("SELECT COUNT(*) as count FROM matrices WHERE type = 'CASHBOARD' AND status = 'OPEN'").get() as any).count;
      logger.info(`Current open Cash-Board matrices: ${cashboardCount}`);
      
      if (cashboardCount === 0) {
        logger.info(`Seeding initial Cash-Board matrix...`);
        const m = await this.createMatrix('CASHBOARD');
        await db.prepare("INSERT INTO matrix_positions (matrix_id, user_id, position) VALUES (?, ?, 1)").run(m.id, adminId);
        logger.info(`Initial Cash-Board matrix created and admin placed in position 1.`);
      }
    } catch (err) {
      logger.error("Error in seedInitialMatrices:", err);
    }
  }

  private static ensureSystemUsersInternal() {
    // No longer creating explosion users
  }
}
