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
