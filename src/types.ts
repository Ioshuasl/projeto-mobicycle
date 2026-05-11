export type UserStatus = 'PARTNER' | 'BRONZE' | 'ELITE' | 'MASTER';

export type CareerLevel = 
  | 'LICENSED'
  | 'PARTNER'
  | 'EXECUTIVO_1'
  | 'EXECUTIVO_2'
  | 'EXECUTIVO_3'
  | 'EXECUTIVO_4'
  | 'DIAMANTE'
  | 'BLACK_DIAMANTE'
  | 'VICE_PRESIDENTE'
  | 'PRESIDENTE'
  | 'CEO_PLE';

export interface User {
  id: string;
  name: string;
  nickname?: string;
  email: string;
  cpf: string;
  phone?: string;
  pixKey?: string;
  birthDate?: string;
  referralsCount: number;
  cycleSalesCount: number;
  balance: number;
  debtBalance: number; // Saldo devedor para clawbacks
  cashback_balance: number;
  snack_fast_cashback: number;
  energy_cashback: number;
  guincho_cashback: number;
  hability_test_cashback: number;

  voucherBalance: number;
  totalEarnings: number;
  documentStatus: 'PENDING' | 'VALIDATED' | 'REJECTED';
  status: UserStatus;
  careerLevel: CareerLevel;
  reentryMode: 'AUTO' | 'MANUAL';
  avatar?: string;
  referralCode?: string;
  referrerId?: string;
  role: 'admin' | 'user';
  bankName?: string;
  bankAgency?: string;
  bankAccount?: string;
  bankAccountType?: string;
  isActivated?: boolean;
}

export type MatrixType = 'ONBORD' | 'CASHBOARD';

export interface Matrix {
  id: string;
  type: MatrixType;
  status: 'OPEN' | 'CLOSED';
  createdAt: string;
  positions?: any[];
}

export interface MatrixPosition {
  matrixId: string;
  userId: string;
  position: number; // 1 to 7
  userName: string;
  userNickname?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  amount: number;
  type: 'ADHESION' | 'BONUS' | 'WITHDRAWAL' | 'REENTRY' | 'CLAWBACK' | 'REFUND' | 'CASHBACK';
  status: 'PENDING' | 'COMPLETED' | 'REJECTED';
  description?: string;
  createdAt: string;
}

export interface Notification {
  id: string;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

export interface Voucher {
  id: string;
  code: string;
  amount: number;
  ownerId: string;
  recipientId?: string;
  recipientEmail?: string;
  recipientPhone?: string;
  status: 'AVAILABLE' | 'USED' | 'SENT';
  createdAt: string;
}

export interface UserDocument {
  id: string;
  userId: string;
  filename: string;
  type: 'NFSE' | 'ADDRESS_PROOF_LUZ' | 'ADDRESS_PROOF_PHONE';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  rejectionReason?: string;
  amount?: number;
  createdAt: string;
}

export interface Badge {
  id: string;
  userId: string;
  type: string;
  name: string;
  description: string;
  createdAt: string;
}

export interface UserProgress {
  referrals: number;
  cycles: number;
  networkSales: number;
  currentLevel: CareerLevel;
  nextMilestone?: { count: number; level: CareerLevel };
  currentMilestone: { count: number; level: CareerLevel };
  progressToNext: number;
}
