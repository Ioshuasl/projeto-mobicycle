/**
 * Pagamentos — integração com o backend (Checkout Pro Mercado Pago).
 * O JWT é injetado automaticamente em /api/* por `src/lib/fetchInterceptor.ts`.
 */

export type LicenseCheckoutProResult =
  | {
      ok: true;
      checkoutUrl: string;
      preferenceId: string;
      externalReference: string;
      checkoutId: string;
      amount: number;
    }
  | { ok: false; error: string };

async function readJson(res: Response): Promise<Record<string, unknown>> {
  try {
    return (await res.json()) as Record<string, unknown>;
  } catch {
    return {};
  }
}

export class PaymentService {
  /**
   * Cria preferência Checkout Pro e devolve a URL para o usuário pagar no site do Mercado Pago.
   */
  static async startLicenseCheckoutPro(): Promise<LicenseCheckoutProResult> {
    console.log('[debug:license][PaymentService] POST /api/license/checkout-pro …');
    const res = await fetch('/api/license/checkout-pro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    });
    const data = await readJson(res);
    console.log('[debug:license][PaymentService] checkout-pro resposta', {
      httpStatus: res.status,
      ok: res.ok,
      keys: Object.keys(data),
    });
    if (!res.ok) {
      return { ok: false as const, error: String(data.error ?? `Erro ${res.status}`) };
    }
    const checkoutUrl = data.checkoutUrl;
    if (typeof checkoutUrl !== 'string' || !checkoutUrl.trim()) {
      return { ok: false as const, error: 'Resposta inválida do servidor (sem URL de checkout).' };
    }
    const out = {
      ok: true as const,
      checkoutUrl: checkoutUrl.trim(),
      preferenceId: String(data.preferenceId ?? ''),
      externalReference: String(data.externalReference ?? ''),
      checkoutId: String(data.checkoutId ?? ''),
      amount: Number(data.amount ?? 0),
    };
    console.log('[debug:license][PaymentService] checkout criado', {
      preferenceId: out.preferenceId,
      externalReference: out.externalReference,
      checkoutId: out.checkoutId,
      amount: out.amount,
    });
    return out;
  }

  /** Consulta se a licença já foi ativada (ex.: após webhook do MP processar o pagamento). */
  static async isUserLicenseActivated(): Promise<boolean> {
    const res = await fetch('/api/me');
    const user = res.ok ? ((await res.json()) as { id?: string; isActivated?: boolean | number }) : null;
    const raw = user?.isActivated;
    const activated = Boolean(raw);
    console.log('[debug:license][PaymentService] GET /api/me (poll)', {
      httpStatus: res.status,
      userId: user?.id,
      isActivatedRaw: raw,
      isActivatedBool: activated,
    });
    if (!res.ok) return false;
    return activated;
  }
}
