import { db, generateId } from './db.ts';
import webpush from 'web-push';
import { sendNotificationEmail } from '../../email.ts';

let vapidKeysInitialized = false;

export async function initNotifications() {
  if (vapidKeysInitialized) return;
  
  const vapidKeysSetting = await db.prepare("SELECT value FROM settings WHERE `key` = 'vapid_keys'").get() as any;
  let vapidKeys;
  if (!vapidKeysSetting) {
    vapidKeys = webpush.generateVAPIDKeys();
    await db.prepare("INSERT INTO settings (`key`, value) VALUES ('vapid_keys', ?)").run(JSON.stringify(vapidKeys));
  } else {
    vapidKeys = JSON.parse(vapidKeysSetting.value);
  }

  webpush.setVapidDetails(
    'mailto:support@mobicyclo.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  
  vapidKeysInitialized = true;
}

export class NotificationManager {
  static async createNotification(userId: string, type: string, message: string) {
    try {
      const user = await db.prepare("SELECT id, email, name FROM users WHERE id = ?").get(userId) as any;
      if (!user) {
        console.warn(`Attempted to notify non-existent user: ${userId}`);
        return;
      }

      const id = generateId("notif");
      await db.prepare("INSERT INTO notifications (id, user_id, type, message) VALUES (?, ?, ?, ?)").run(id, userId, type, message);
      
      // Email Notification
      if (user.email) {
        const subjects: Record<string, string> = {
          'CASHBOARD_ENTRY': '🚀 Bem-vindo ao Cash-Board!',
          'MATRIX_FILL': '📊 Atualização na sua Matriz',
          'MATRIX_PROGRESS': '📈 Progresso na sua Rede',
          'BONUS_AVAILABLE': '💰 Bônus Disponível para Saque (CashBoard)!',
          'CASHBACK_RECEIVED': '✨ Cashback Recebido',
          'NEW_REFERRAL': '👥 Nova Indicação Direta',
          'QUALIFICATION_UPDATE': '⭐ Nova Qualificação Alcançada'
        };
        const subject = subjects[type] || 'Nova Notificação Mobicyclo';
        await sendNotificationEmail(user.email, subject, message);
      }

      // Push Notification
      const subscriptions = await db.prepare("SELECT subscription FROM push_subscriptions WHERE user_id = ?").all(userId) as any[];
      for (const sub of subscriptions) {
        try {
          const pushSubscription = JSON.parse(sub.subscription);
          await webpush.sendNotification(pushSubscription, JSON.stringify({
            title: 'Mobicyclo',
            body: message,
            icon: '/logo.png',
            data: { url: '/dashboard' }
          }));
        } catch (err: any) {
          if (err.statusCode === 400 || err.statusCode === 403 || err.statusCode === 404 || err.statusCode === 410) {
            console.log(`DEBUG: Removing invalid push subscription for user ${userId} (Status ${err.statusCode})`);
            await db.prepare("DELETE FROM push_subscriptions WHERE user_id = ? AND subscription = ?").run(userId, sub.subscription);
          } else {
            console.error("Error sending push notification:", err);
          }
        }
      }
    } catch (err) {
      console.error("Error creating notification:", err);
    }
  }
}
