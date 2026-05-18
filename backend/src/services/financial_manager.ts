import { db, generateId, getSetting, withTransaction } from '../config/db.ts';
import logger from '../utils/logger.ts';
import { NotificationManager } from './notification_manager.ts';
import { AchievementManager } from './achievement_manager.ts';

export class FinancialManager {
  static async addReferralBonus(referrerId: string, referredId: string, isReentry = false) {
    try {
      const bonusAmount = parseFloat(await getSetting('matrix_referral_bonus', '65'));
      const snackBonus = parseFloat(await getSetting('matrix_cashback_snack_fixed', '0'));
      const energyBonus = parseFloat(await getSetting('matrix_cashback_energy_fixed', '0'));
      const guinchoBonus = parseFloat(await getSetting('matrix_cashback_guincho_fixed', '0'));
      const habilityBonus = parseFloat(await getSetting('matrix_cashback_hability_fixed', '0'));

      const referred = await db.prepare("SELECT name FROM users WHERE id = ?").get(referredId) as any;
      const desc = isReentry ? `Bônus Indicação (Reentrada - ${referred?.name})` : `Bônus Indicação (Adesão - ${referred?.name})`;
      
      if (bonusAmount > 0) {
        await db.prepare(`
          UPDATE users 
          SET cashback_balance = cashback_balance + ?, 
              total_earnings = total_earnings + ? 
          WHERE id = ?
        `).run(bonusAmount, bonusAmount, referrerId);

        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'REFERRAL', ?, 'COMPLETED')").run(
          generateId("tx"), referrerId, bonusAmount, desc + " (Cashback Corridas)"
        );

        await NotificationManager.createNotification(referrerId, 'BONUS_RECEIVED', `Você recebeu R$ ${bonusAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de bônus por indicação em Cashback Corridas!`);
      }

      if (snackBonus > 0) {
        await db.prepare("UPDATE users SET snack_fast_cashback = snack_fast_cashback + ?, total_earnings = total_earnings + ? WHERE id = ?").run(snackBonus, snackBonus, referrerId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), referrerId, snackBonus, `Cashback Snack (Indicação - ${referred?.name})`
        );
      }

      if (energyBonus > 0) {
        await db.prepare("UPDATE users SET energy_cashback = energy_cashback + ?, total_earnings = total_earnings + ? WHERE id = ?").run(energyBonus, energyBonus, referrerId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), referrerId, energyBonus, `Cashback Energy (Indicação - ${referred?.name})`
        );
      }

      if (guinchoBonus > 0) {
        await db.prepare("UPDATE users SET guincho_cashback = guincho_cashback + ?, total_earnings = total_earnings + ? WHERE id = ?").run(guinchoBonus, guinchoBonus, referrerId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), referrerId, guinchoBonus, `Cashback Guincho (Indicação - ${referred?.name})`
        );
      }

      if (habilityBonus > 0) {
        await db.prepare("UPDATE users SET hability_test_cashback = hability_test_cashback + ?, total_earnings = total_earnings + ? WHERE id = ?").run(habilityBonus, habilityBonus, referrerId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), referrerId, habilityBonus, `Cashback Hability (Indicação - ${referred?.name})`
        );
      }

      if (snackBonus > 0 || energyBonus > 0 || guinchoBonus > 0 || habilityBonus > 0) {
        await NotificationManager.createNotification(referrerId, 'CASHBACK_RECEIVED', `Você recebeu bônus de cashback adicionais por uma nova indicação!`);
      }
      
      await AchievementManager.checkAchievements(referrerId);
    } catch (err) {
      logger.error("Error in addReferralBonus:", err);
    }
  }

  static async incrementNetworkSales(userId: string) {
    try {
      let currentId = userId;
      const visited = new Set();
      const firstUser = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
      if (!firstUser || !firstUser.referrer_id) return;
      currentId = firstUser.referrer_id;

      while (currentId && !visited.has(currentId)) {
        visited.add(currentId);
        await db.prepare("UPDATE users SET cycle_sales_count = cycle_sales_count + 1 WHERE id = ?").run(currentId);
        
        const updatedUser = await db.prepare("SELECT cycle_sales_count FROM users WHERE id = ?").get(currentId) as any;
        if (updatedUser) {
          const count = updatedUser.cycle_sales_count;
          let newLevel = 'LICENSED';
          
          const reqCeo = parseInt(await getSetting('cycles_required_ceo_ple', '1000'));
          const reqPres = parseInt(await getSetting('cycles_required_presidente', '500'));
          const reqVice = parseInt(await getSetting('cycles_required_vice_presidente', '250'));
          const reqBlack = parseInt(await getSetting('cycles_required_black_diamante', '100'));
          const reqDiam = parseInt(await getSetting('cycles_required_diamante', '50'));
          const reqExec4 = parseInt(await getSetting('cycles_required_executivo_4', '25'));
          const reqExec3 = parseInt(await getSetting('cycles_required_executivo_3', '10'));
          const reqExec2 = parseInt(await getSetting('cycles_required_executivo_2', '5'));
          const reqExec1 = parseInt(await getSetting('cycles_required_executivo_1', '2'));
          const reqPartner = parseInt(await getSetting('cycles_required_partner', '1'));

          if (count >= reqCeo) newLevel = 'CEO_PLE';
          else if (count >= reqPres) newLevel = 'PRESIDENTE';
          else if (count >= reqVice) newLevel = 'VICE_PRESIDENTE';
          else if (count >= reqBlack) newLevel = 'BLACK_DIAMANTE';
          else if (count >= reqDiam) newLevel = 'DIAMANTE';
          else if (count >= reqExec4) newLevel = 'EXECUTIVO_4';
          else if (count >= reqExec3) newLevel = 'EXECUTIVO_3';
          else if (count >= reqExec2) newLevel = 'EXECUTIVO_2';
          else if (count >= reqExec1) newLevel = 'EXECUTIVO_1';
          else if (count >= reqPartner) newLevel = 'PARTNER';
          
          await db.prepare("UPDATE users SET career_level = ? WHERE id = ?").run(newLevel, currentId);
        }

        const nextReferrer = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
        currentId = nextReferrer ? nextReferrer.referrer_id : null;
      }
    } catch (err) {
      logger.error("Error in incrementNetworkSales:", err);
    }
  }

  static async payInfiniteBonus(userId: string, amount: number, isReentry = false) {
    try {
      if (amount <= 0) return;
      
      const user = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.referrer_id) return;

      let currentId = user.referrer_id;
      let paidAmount = 0;
      const visited = new Set();
      const typeLabel = isReentry ? 'Reentrada' : 'Adesão';

      const levelFixedBonuses: Record<string, number> = {
        'LICENSED': 0,
        'PARTNER': parseFloat(await getSetting('bonus_percent_partner', '0')),
        'EXECUTIVO_1': parseFloat(await getSetting('bonus_percent_executivo_1', '5')),
        'EXECUTIVO_2': parseFloat(await getSetting('bonus_percent_executivo_2', '10')),
        'EXECUTIVO_3': parseFloat(await getSetting('bonus_percent_executivo_3', '15')),
        'EXECUTIVO_4': parseFloat(await getSetting('bonus_percent_executivo_4', '20')),
        'DIAMANTE': parseFloat(await getSetting('bonus_percent_diamante', '25')),
        'BLACK_DIAMANTE': parseFloat(await getSetting('bonus_percent_black_diamante', '30')),
        'VICE_PRESIDENTE': parseFloat(await getSetting('bonus_percent_vice_presidente', '35')),
        'PRESIDENTE': parseFloat(await getSetting('bonus_percent_presidente', '40')),
        'CEO_PLE': parseFloat(await getSetting('bonus_percent_ceo_ple', '45'))
      };

      while (currentId && !visited.has(currentId) && paidAmount < 45) {
        visited.add(currentId);
        const referrer = await db.prepare("SELECT id, career_level, name FROM users WHERE id = ?").get(currentId) as any;
        if (!referrer) break;

        const currentLevelAmount = levelFixedBonuses[referrer.career_level] || 0;
        const diffAmount = currentLevelAmount - paidAmount;

        if (diffAmount > 0) {
          const bonus = diffAmount;
          
          await db.prepare(`
            UPDATE users 
            SET cashback_balance = cashback_balance + ?, 
                total_earnings = total_earnings + ? 
            WHERE id = ?
          `).run(bonus, bonus, currentId);

          await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
            generateId("tx"), currentId, bonus, `Bônus Infinito ${typeLabel} (${referrer.career_level} - R$ ${diffAmount})`
          );

          paidAmount = currentLevelAmount;
          await NotificationManager.createNotification(currentId, 'BONUS_RECEIVED', `Você recebeu R$ ${bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de Bônus Infinito sobre ${typeLabel} (Cashback)!`);
        }

        const next = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
        currentId = next ? next.referrer_id : null;
      }
    } catch (err) {
      logger.error("Error in payInfiniteBonus:", err);
    }
  }

  static async payInfiniteBonusOnCycle(userId: string, amount: number) {
    try {
      if (amount <= 0) return;
      
      const user = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.referrer_id) return;

      let currentId = user.referrer_id;
      let paidAmount = 0;
      const visited = new Set();

      const levelFixedBonuses: Record<string, number> = {
        'LICENSED': 0,
        'PARTNER': parseFloat(await getSetting('bonus_percent_partner', '0')),
        'EXECUTIVO_1': parseFloat(await getSetting('bonus_percent_executivo_1', '5')),
        'EXECUTIVO_2': parseFloat(await getSetting('bonus_percent_executivo_2', '10')),
        'EXECUTIVO_3': parseFloat(await getSetting('bonus_percent_executivo_3', '15')),
        'EXECUTIVO_4': parseFloat(await getSetting('bonus_percent_executivo_4', '20')),
        'DIAMANTE': parseFloat(await getSetting('bonus_percent_diamante', '25')),
        'BLACK_DIAMANTE': parseFloat(await getSetting('bonus_percent_black_diamante', '30')),
        'VICE_PRESIDENTE': parseFloat(await getSetting('bonus_percent_vice_presidente', '35')),
        'PRESIDENTE': parseFloat(await getSetting('bonus_percent_presidente', '40')),
        'CEO_PLE': parseFloat(await getSetting('bonus_percent_ceo_ple', '45'))
      };

      while (currentId && !visited.has(currentId) && paidAmount < 45) {
        visited.add(currentId);
        const referrer = await db.prepare("SELECT id, career_level, name FROM users WHERE id = ?").get(currentId) as any;
        if (!referrer) break;

        const currentLevelAmount = levelFixedBonuses[referrer.career_level] || 0;
        const diffAmount = currentLevelAmount - paidAmount;

        if (diffAmount > 0) {
          const bonus = diffAmount;
          
          await db.prepare(`
            UPDATE users 
            SET cashback_balance = cashback_balance + ?, 
                total_earnings = total_earnings + ? 
            WHERE id = ?
          `).run(bonus, bonus, currentId);

          await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
            generateId("tx"), currentId, bonus, `Bônus Infinito Ciclo (${referrer.career_level} - R$ ${diffAmount})`
          );

          paidAmount = currentLevelAmount;
          await NotificationManager.createNotification(currentId, 'BONUS_RECEIVED', `Você recebeu R$ ${bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de Bônus Infinito sobre Ciclo (Cashback)!`);
        }

        const next = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
        currentId = next ? next.referrer_id : null;
      }
    } catch (err) {
      logger.error("Error in payInfiniteBonusOnCycle:", err);
    }
  }

  static async payCashbackUsageUnilevelBonus(userId: string, amount: number, serviceName: string) {
    try {
      if (amount <= 0) return;

      const user = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.referrer_id) return;

      let currentId = user.referrer_id;
      const visited = new Set();
      
      const levelPercents = [
        parseFloat(await getSetting('usage_unilevel_l1', '10')),
        parseFloat(await getSetting('usage_unilevel_l2', '5')),
        parseFloat(await getSetting('usage_unilevel_l3', '3')),
        parseFloat(await getSetting('usage_unilevel_l4', '2')),
        parseFloat(await getSetting('usage_unilevel_l5', '1')),
        parseFloat(await getSetting('usage_unilevel_l6', '1')),
        parseFloat(await getSetting('usage_unilevel_l7', '1')),
        parseFloat(await getSetting('usage_unilevel_l8', '1'))
      ];

      for (let i = 0; i < levelPercents.length; i++) {
        if (!currentId || visited.has(currentId)) break;
        visited.add(currentId);

        const referrer = await db.prepare("SELECT id, referrals_count FROM users WHERE id = ?").get(currentId) as any;
        
        if (referrer && referrer.referrals_count >= 1) {
          const bonus = amount * (levelPercents[i] / 100);
          
          await db.prepare(`
            UPDATE users 
            SET cashback_balance = cashback_balance + ?, 
                total_earnings = total_earnings + ? 
            WHERE id = ?
          `).run(bonus, bonus, currentId);

          await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
            generateId("tx"), currentId, bonus, `Bônus Unilevel Uso ${serviceName} (Nível ${i + 1} - ${levelPercents[i]}%)`
          );

          await NotificationManager.createNotification(currentId, 'BONUS_RECEIVED', `Você recebeu R$ ${bonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de Bônus Unilevel sobre uso de ${serviceName} (Cashback)!`);
        }

        const next = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
        currentId = next ? next.referrer_id : null;
      }
    } catch (err) {
      logger.error("Error in payCashbackUsageUnilevelBonus:", err);
    }
  }

  static async payLicenseUnilevelBonus(userId: string, isReentry = false) {
    try {
      const user = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(userId) as any;
      if (!user || !user.referrer_id) return;

      let currentId = user.referrer_id;
      const visited = new Set();
      const adhesionFee = parseFloat(await getSetting('matrix_adhesion_fee', '650'));
      const typeLabel = isReentry ? 'Reentrada' : 'Adesão';
      
      const distributions = [
        { key: 'service_fee_percent_corridas', default: 10, field: 'cashback_balance', label: 'Corridas' },
        { key: 'service_fee_percent_energy', default: 3, field: 'energy_cashback', label: 'Mobicyclo Energy' },
        { key: 'service_fee_percent_snack', default: 1.5, field: 'snack_fast_cashback', label: 'Snack' },
        { key: 'service_fee_percent_guincho', default: 0.6, field: 'guincho_cashback', label: 'Guincho' },
        { key: 'service_fee_percent_hability', default: 0.15, field: 'hability_test_cashback', label: 'Hability' }
      ];

      for (let i = 0; i < distributions.length; i++) {
        if (!currentId || visited.has(currentId)) break;
        visited.add(currentId);

        const referrer = await db.prepare("SELECT id, referrals_count FROM users WHERE id = ?").get(currentId) as any;
        
        if (referrer && referrer.referrals_count >= 1) {
          const dist = distributions[i];
          const percent = parseFloat(await getSetting(dist.key, dist.default.toString()));
          const amount = adhesionFee * (percent / 100);
          
          if (amount > 0) {
            await db.prepare(`
              UPDATE users 
              SET ${dist.field} = ${dist.field} + ?, 
                  total_earnings = total_earnings + ? 
              WHERE id = ?
            `).run(amount, amount, currentId);

            await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
              generateId("tx"), currentId, amount, `Bônus Unilevel ${typeLabel} - Taxa ${dist.label} (${percent}%)`
            );

            await NotificationManager.createNotification(currentId, 'BONUS_RECEIVED', `Você recebeu R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} de Bônus Unilevel sobre ${typeLabel} (${dist.label})!`);
          }
        }

        const next = await db.prepare("SELECT referrer_id FROM users WHERE id = ?").get(currentId) as any;
        currentId = next ? next.referrer_id : null;
      }
    } catch (err) {
      logger.error("Error in payLicenseUnilevelBonus:", err);
    }
  }

  static async payOnboardBonus(userId: string, isReentry = false) {
    try {
      if (userId.startsWith('sys_')) return;

      const onboardBonus = parseFloat(await getSetting('matrix_onboard_bonus', '65'));
      const snackBonus = parseFloat(await getSetting('matrix_cashback_snack_fixed', '0'));
      const energyBonus = parseFloat(await getSetting('matrix_cashback_energy_fixed', '0'));
      const guinchoBonus = parseFloat(await getSetting('matrix_cashback_guincho_fixed', '0'));
      const habilityBonus = parseFloat(await getSetting('matrix_cashback_hability_fixed', '0'));

      const typeLabel = isReentry ? 'Reentrada' : 'Adesão';

      if (onboardBonus > 0) {
        await db.prepare("UPDATE users SET cashback_balance = cashback_balance + ? WHERE id = ?").run(onboardBonus, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS_ADHERENCE', ?, 'COMPLETED')").run(
          generateId("tx"), userId, onboardBonus, `Bônus de ${typeLabel} On-Board (Cashback Corridas)`
        );
        await NotificationManager.createNotification(userId, 'BONUS_AVAILABLE', `Você recebeu um bônus de ${typeLabel.toLowerCase()} de R$ ${onboardBonus.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} em Cashback Corridas!`);
      }

      if (snackBonus > 0) {
        await db.prepare("UPDATE users SET snack_fast_cashback = snack_fast_cashback + ? WHERE id = ?").run(snackBonus, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), userId, snackBonus, `Cashback Snack (${typeLabel})`
        );
      }

      if (energyBonus > 0) {
        await db.prepare("UPDATE users SET energy_cashback = energy_cashback + ? WHERE id = ?").run(energyBonus, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), userId, energyBonus, `Cashback Energy (${typeLabel})`
        );
      }

      if (guinchoBonus > 0) {
        await db.prepare("UPDATE users SET guincho_cashback = guincho_cashback + ? WHERE id = ?").run(guinchoBonus, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), userId, guinchoBonus, `Cashback Guincho (${typeLabel})`
        );
      }

      if (habilityBonus > 0) {
        await db.prepare("UPDATE users SET hability_test_cashback = hability_test_cashback + ? WHERE id = ?").run(habilityBonus, userId);
        await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'CASHBACK', ?, 'COMPLETED')").run(
          generateId("tx"), userId, habilityBonus, `Cashback Hability (${typeLabel})`
        );
      }

      if (snackBonus > 0 || energyBonus > 0 || guinchoBonus > 0 || habilityBonus > 0) {
        await NotificationManager.createNotification(userId, 'CASHBACK_RECEIVED', `Você recebeu bônus de cashback adicionais por sua ${typeLabel.toLowerCase()}!`);
      }
    } catch (err) {
      logger.error("Error in payOnboardBonus:", err);
    }
  }

  static async addFlowEconomy(amount: number) {
    try {
      if (amount <= 0) return;
      const current = await db.prepare("SELECT value FROM settings WHERE `key` = 'flow_economy'").get() as any;
      const newValue = (parseFloat(current?.value || '0') + amount).toString();
      await db.prepare("UPDATE settings SET value = ? WHERE `key` = 'flow_economy'").run(newValue);
      logger.info(`Flow Economy updated: Added R$ ${amount.toFixed(2)}. Total: R$ ${newValue}`);
    } catch (err) {
      logger.error("Error updating flow economy:", err);
    }
  }

  static async requestWithdrawal(userId: string, amount: number, pixKey: string) {
    const user = await db.prepare("SELECT balance FROM users WHERE id = ?").get(userId) as any;
    if (!user || user.balance < amount) {
      throw new Error("Saldo insuficiente");
    }

    await withTransaction(async () => {
      await db.prepare("UPDATE users SET balance = balance - ? WHERE id = ?").run(amount, userId);
      await db.prepare("UPDATE users SET pix_key = ? WHERE id = ?").run(pixKey, userId);
      await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'WITHDRAWAL', ?, 'PENDING')").run(
        generateId("tx"), userId, amount, `Solicitação de Saque (PIX: ${pixKey})`
      );
      await NotificationManager.createNotification(userId, 'WITHDRAWAL_REQUESTED', `Sua solicitação de saque de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi enviada e está em processamento.`);
    });

    return await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, avatar, referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance, cashback_balance, snack_fast_cashback, energy_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(userId);
  }

  static async processDeposit(userId: string, amount: number) {
    if (amount <= 0) {
      throw new Error("Valor inválido");
    }

    await withTransaction(async () => {
      // Add balance
      await db.prepare("UPDATE users SET balance = balance + ? WHERE id = ?").run(amount, userId);
      
      // Create transaction
      await db.prepare("INSERT INTO transactions (id, user_id, amount, type, description, status) VALUES (?, ?, ?, 'BONUS', ?, 'COMPLETED')").run(
        generateId("tx"), userId, amount, `Depósito de Fundos`
      );

      await NotificationManager.createNotification(userId, 'DEPOSIT_CONFIRMED', `Seu depósito de R$ ${amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} foi confirmado e creditado em seu saldo.`);
    });

    return await db.prepare("SELECT id, name, nickname, email, cpf, phone, pix_key as pixKey, birth_date as birthDate, avatar, referrals_count as referralsCount, cycle_sales_count as cycleSalesCount, balance, debt_balance as debtBalance, cashback_balance, snack_fast_cashback, energy_cashback, guincho_cashback, hability_test_cashback, voucher_balance as voucherBalance, total_earnings as totalEarnings, document_status as documentStatus, stars, status, career_level as careerLevel, referral_code as referralCode, referrer_id as referrerId, reentry_mode as reentryMode, role, is_activated as isActivated FROM users WHERE id = ?").get(userId);
  }
}
