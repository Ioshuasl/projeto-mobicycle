import { db, generateId } from './db.ts';

export const validateCPF = (cpf: string) => {
  cpf = cpf.replace(/[^\d]+/g, '');
  if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
  let sum = 0;
  let remainder;
  for (let i = 1; i <= 9; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (11 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(9, 10))) return false;
  sum = 0;
  for (let i = 1; i <= 10; i++) sum = sum + parseInt(cpf.substring(i - 1, i)) * (12 - i);
  remainder = (sum * 10) % 11;
  if ((remainder === 10) || (remainder === 11)) remainder = 0;
  if (remainder !== parseInt(cpf.substring(10, 11))) return false;
  return true;
};

export const generateReferralCode = (name: string) => {
  const prefix = name.split(' ')[0].toUpperCase().substring(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
};

export const updateCareerLevel = async (userId: string) => {
  const u = await db.prepare("SELECT referrals_count, career_level, status FROM users WHERE id = ?").get(userId) as any;
  if (!u) return;

  const milestones = [
    { count: 100000, level: 'ROYAL_BLACK_DIAMOND', stars: 5, status: 'MASTER' },
    { count: 10000, level: 'BLACK_DIAMOND', stars: 5, status: 'MASTER' },
    { count: 1000, level: 'DOUBLE_DIAMOND', stars: 5, status: 'MASTER' },
    { count: 100, level: 'DIAMOND', stars: 5, status: 'MASTER' },
    { count: 50, level: 'EMERALD', stars: 4, status: 'ELITE' },
    { count: 10, level: 'GOLD', stars: 3, status: 'ELITE' },
    { count: 5, level: 'SILVER', stars: 2, status: 'BRONZE' },
    { count: 2, level: 'BRONZE', stars: 1, status: 'BRONZE' },
    { count: 1, level: 'PARTNER', stars: 0, status: 'PARTNER' },
    { count: 0, level: 'LICENSED', stars: 0, status: 'PARTNER' }
  ];
  const m = milestones.find(m => u.referrals_count >= m.count);
  if (m && (u.career_level !== m.level || u.status !== m.status)) {
    await db.prepare("UPDATE users SET stars = ?, career_level = ?, status = ? WHERE id = ?").run(m.stars, m.level, m.status, userId);
  }
};
