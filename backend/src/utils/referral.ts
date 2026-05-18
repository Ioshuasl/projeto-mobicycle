export function generateReferralCode(name: string): string {
  const prefix = name.split(" ")[0].toUpperCase().substring(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}
