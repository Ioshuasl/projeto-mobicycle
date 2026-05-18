import { db, generateId } from '../config/db.ts';
import { NotificationManager } from './notification_manager.ts';

export class AchievementManager {
  static async checkAchievements(userId: string) {
    try {
      const user = await db.prepare("SELECT referrals_count, career_level FROM users WHERE id = ?").get(userId) as any;
      if (!user) return;

      const milestones = [
        { count: 1, type: 'FIRST_REFERRAL', name: 'Primeira Indicação', desc: 'Você indicou seu primeiro parceiro!' },
        { count: 2, type: 'QUALIFIED', name: 'Qualificado', desc: 'Você agora está qualificado para ciclar no On-Board!' },
        { count: 5, type: 'TEAM_BUILDER', name: 'Construtor de Equipe', desc: 'Você indicou 5 parceiros!' },
        { count: 10, type: 'LEADER', name: 'Líder Mobicyclo', desc: 'Você indicou 10 parceiros!' },
        { count: 50, type: 'ELITE_LEADER', name: 'Líder Elite', desc: 'Você indicou 50 parceiros!' },
        { count: 100, type: 'MASTER_LEADER', name: 'Líder Master', desc: 'Você indicou 100 parceiros!' }
      ];

      for (const m of milestones) {
        if (user.referrals_count >= m.count) {
          const exists = await db.prepare("SELECT id FROM badges WHERE user_id = ? AND type = ?").get(userId, m.type);
          if (!exists) {
            const badgeId = generateId("badge");
            await db.prepare("INSERT INTO badges (id, user_id, type, name, description) VALUES (?, ?, ?, ?, ?)").run(
              badgeId, userId, m.type, m.name, m.desc
            );
            await NotificationManager.createNotification(userId, 'ACHIEVEMENT', `🏆 Conquista Desbloqueada: ${m.name}!`);
          }
        }
      }
    } catch (err) {
      console.error("Error in checkAchievements:", err);
    }
  }
}
