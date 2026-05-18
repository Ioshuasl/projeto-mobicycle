export const CASHBACK_BALANCE_COLUMNS = {
  Corridas: "cashback_balance",
  Snack: "snack_fast_cashback",
  Energy: "energy_cashback",
  "Bônus Guincho": "guincho_cashback",
} as const;

export type CashbackServiceName = keyof typeof CASHBACK_BALANCE_COLUMNS;

export type CashbackBalanceColumn =
  (typeof CASHBACK_BALANCE_COLUMNS)[CashbackServiceName] | "cashback_balance";

export function resolveCashbackColumn(serviceName: string): CashbackBalanceColumn {
  return CASHBACK_BALANCE_COLUMNS[serviceName as CashbackServiceName] ?? "cashback_balance";
}
