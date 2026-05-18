/** Perfil público do usuário (sem senha). */
export type PublicUser = Record<string, unknown> & {
  id: string;
  email: string;
};

/** Perfil completo para sessão (/me, /init). */
export type SessionProfile = Record<string, unknown> & {
  id: string;
  email: string;
  isActivated: number;
  role?: string;
};

export type UserLoginRow = PublicUser & {
  password: string;
};

export type UserUpdatePayload = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  pixKey?: string;
  birthDate?: string;
  avatar?: string;
  reentryMode?: string;
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: string;
  password?: string;
};

export type UserProfileAfterUpdate = Record<string, unknown> & { id: string };

export type ReferralListItem = {
  id: string;
  name: string;
  nickname: string;
  email: string;
  status: string;
  avatar: string | null;
  createdAt: string;
};

export type NetworkReferralRow = {
  id: string;
  name: string;
  nickname: string;
  status: string;
  avatar: string | null;
  referralsCount: number;
  createdAt: string;
};

export type NetworkNode = NetworkReferralRow & {
  matrixType: string | null;
  matrixPosition: number | null;
  children: NetworkNode[] | null;
};
