export type MatrixCycleRow = Record<string, unknown> & { id: string };

export type MatrixJoinResult = {
  success?: boolean;
  error?: string;
  message?: string;
  cycleInfo?: unknown;
};

export type MatrixActionOutcome =
  | { ok: true; cycleInfo?: unknown }
  | { ok: false; body: MatrixJoinResult };

export type MatrixListQuery = {
  type?: string;
  page?: string;
  limit?: string;
};
