import { User, Transaction } from '../types';

export const PACKAGE_VALUE = 650.00;
export const ADMIN_TAX_PERCENTAGE = 0.05;

export interface RefundResult {
  packageValue: number;
  adminTax: number;
  cashbackConsumed: number;
  totalRefund: number;
}

/**
 * Calcula o valor líquido a ser devolvido ao cliente
 */
export function calculateRefund(cashbackConsumed: number): RefundResult {
  const adminTax = PACKAGE_VALUE * ADMIN_TAX_PERCENTAGE;
  const totalRefund = PACKAGE_VALUE - adminTax - cashbackConsumed;
  
  return {
    packageValue: PACKAGE_VALUE,
    adminTax,
    cashbackConsumed,
    totalRefund: Math.max(0, totalRefund)
  };
}

/**
 * Simula o processamento de um estorno na rede (Clawback)
 */
export function processClawback(
  uplineUserId: string, 
  originalCommission: number, 
  currentUserBalance: number
): { 
  newBalance: number; 
  debtBalance: number; 
  transaction: Partial<Transaction> 
} {
  let newBalance = currentUserBalance;
  let debtBalance = 0;
  
  if (currentUserBalance >= originalCommission) {
    newBalance -= originalCommission;
  } else {
    debtBalance = originalCommission - currentUserBalance;
    newBalance = 0;
  }
  
  return {
    newBalance,
    debtBalance,
    transaction: {
      amount: -originalCommission,
      type: 'CLAWBACK',
      status: 'COMPLETED',
      createdAt: new Date().toISOString()
    }
  };
}

export const LEGAL_CLAUSES = {
  SOLIDARITY: "O Afiliado declara-se ciente de que as comissões são vinculadas à efetiva manutenção da venda. Em caso de estorno pelo comprador, a comissão gerada será estornada da carteira do Afiliado.",
  ADMIN_TAX: "O cancelamento por mera liberalidade do cliente após o uso parcial de serviços (Cashback/App) implicará na retenção de taxa administrativa de 5% e desconto integral dos valores de serviços já usufruídos."
};
