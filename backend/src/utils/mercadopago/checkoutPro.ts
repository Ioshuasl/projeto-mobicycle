/**
 * Checkout Pro — gestão de Preferências (criar, ler, atualizar, buscar) + URL de pagamento.
 * @see https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/overview
 * @see https://www.mercadopago.com.br/developers/pt/reference/preferences/_id/get
 */
import type {
  PreferenceRequest,
  PreferenceResponse,
} from 'mercadopago/dist/clients/preference/commonTypes';
import type {
  PreferenceSearchOptions,
  PreferenceSearchResponse,
} from 'mercadopago/dist/clients/preference/search/types';
import { getPreferenceApi } from './client.ts';
import { assertValidBrlCheckoutAmount, type ValidateAmountOptions } from './amount.ts';
import { buildAbsoluteUrl, isTestAccessToken } from './config.ts';

export type CheckoutProPayer = {
  email: string;
  name?: string;
  surname?: string;
};

export type CheckoutProBackUrls = {
  success: string;
  pending?: string;
  failure?: string;
};

export type CreateCheckoutProPreferenceParams = {
  /** ID interno do pedido (vai em external_reference). */
  externalReference: string;
  /** Título exibido no checkout (ex.: "Depósito na conta"). */
  title: string;
  /** Identificador do item (ex.: "deposit"). */
  itemId?: string;
  amount: number;
  payer: CheckoutProPayer;
  /** URL completa do webhook (notification_url). */
  notificationUrl: string;
  backUrls: CheckoutProBackUrls;
  /**
   * Redirecionamento automático após pagamento aprovado.
   * Se omitido: com back_urls http/localhost não envia auto_return (regra da API MP).
   * Com HTTPS público, o padrão é enviar `approved`.
   */
  autoReturn?: 'approved' | 'all';
  statementDescriptor?: string;
  amountValidation?: ValidateAmountOptions;
};

/** Com back_urls em http ou localhost o MP costuma rejeitar auto_return. */
export function shouldOmitAutoReturnForBackUrls(backUrls: CheckoutProBackUrls): boolean {
  const candidates = [backUrls.success, backUrls.pending, backUrls.failure].filter(Boolean) as string[];
  for (const url of candidates) {
    try {
      const u = new URL(url);
      if (u.protocol === 'http:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') {
        return true;
      }
    } catch {
      return true;
    }
  }
  return false;
}

/**
 * Remove `auto_return` do corpo quando as back_urls são locais/http, para evitar erro da API MP.
 */
export function applySafeAutoReturnToPreferenceRequest(body: PreferenceRequest): PreferenceRequest {
  const back = body.back_urls;
  if (!back?.success) return { ...body };
  const urls: CheckoutProBackUrls = {
    success: back.success,
    pending: back.pending,
    failure: back.failure,
  };
  if (shouldOmitAutoReturnForBackUrls(urls)) {
    const { auto_return: _a, ...rest } = body;
    return rest;
  }
  return { ...body };
}

export type CheckoutProPreferenceResult = {
  preferenceId: string;
  initPoint: string | undefined;
  sandboxInitPoint: string | undefined;
  /** URL para redirecionar o comprador (pode ficar vazia se a preferência expirou ou MP não devolver link). */
  checkoutUrl: string;
  externalReference: string;
  raw: PreferenceResponse;
};

export class MercadoPagoPreferenceError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MercadoPagoPreferenceError';
  }
}

export function assertPreferenceId(preferenceId: string): string {
  const id = preferenceId?.trim();
  if (!id) {
    throw new MercadoPagoPreferenceError('preferenceId é obrigatório');
  }
  return id;
}

/**
 * Converte a resposta da API no formato usado pelo app (inclui URL de checkout escolhida).
 */
export function preferenceResponseToCheckoutResult(
  raw: PreferenceResponse,
  externalReferenceFallback = ''
): CheckoutProPreferenceResult {
  const preferenceId = raw.id;
  if (!preferenceId) {
    throw new MercadoPagoPreferenceError('Mercado Pago não retornou o id da preferência');
  }
  return {
    preferenceId,
    initPoint: raw.init_point,
    sandboxInitPoint: raw.sandbox_init_point,
    checkoutUrl: pickCheckoutRedirectUrl(raw),
    externalReference: raw.external_reference ?? externalReferenceFallback,
    raw,
  };
}

/**
 * Escolhe a URL de checkout: token TEST- → sandbox_init_point; token de produção → init_point.
 * A API MP devolve os dois links na mesma resposta; nunca preferir sandbox quando o token não for de teste.
 */
export function pickCheckoutRedirectUrl(response: PreferenceResponse): string {
  const sandbox = response.sandbox_init_point;
  const prod = response.init_point;
  if (isTestAccessToken()) {
    return (sandbox || prod || '').trim();
  }
  return (prod || sandbox || '').trim();
}

function buildPreferenceBody(params: CreateCheckoutProPreferenceParams): PreferenceRequest {
  const unitPrice = assertValidBrlCheckoutAmount(params.amount, params.amountValidation);
  const itemId = params.itemId ?? 'checkout_item';

  const back_urls: CheckoutProBackUrls = {
    success: params.backUrls.success,
    pending: params.backUrls.pending ?? params.backUrls.success,
    failure: params.backUrls.failure ?? params.backUrls.success,
  };

  let auto_return: 'approved' | 'all' | undefined;
  if (params.autoReturn !== undefined) {
    auto_return = params.autoReturn;
  } else if (!shouldOmitAutoReturnForBackUrls(back_urls)) {
    auto_return = 'approved';
  }

  const body: PreferenceRequest = {
    items: [
      {
        id: itemId,
        title: params.title,
        quantity: 1,
        currency_id: 'BRL',
        unit_price: unitPrice,
      },
    ],
    payer: {
      email: params.payer.email,
      name: params.payer.name,
      surname: params.payer.surname,
    },
    external_reference: params.externalReference,
    notification_url: params.notificationUrl,
    back_urls,
    statement_descriptor: params.statementDescriptor,
  };

  if (auto_return !== undefined) {
    body.auto_return = auto_return;
  }

  return body;
}

/**
 * Cria uma Preferência Checkout Pro e devolve URLs de redirecionamento.
 * @throws MercadoPagoPreferenceError se não houver URL de checkout na resposta
 */
export async function createCheckoutProPreference(
  params: CreateCheckoutProPreferenceParams
): Promise<CheckoutProPreferenceResult> {
  const preference = getPreferenceApi();
  const body = buildPreferenceBody(params);
  const raw = await preference.create({ body });
  const result = preferenceResponseToCheckoutResult(raw, params.externalReference);
  if (!result.checkoutUrl) {
    throw new MercadoPagoPreferenceError(
      'Mercado Pago não retornou init_point nem sandbox_init_point'
    );
  }
  return result;
}

/**
 * Cria preferência a partir de um corpo completo da API (casos avançados / vários itens).
 * Aplica a mesma regra de segurança de `auto_return` com back_urls http/localhost.
 */
export async function createCheckoutProPreferenceFromBody(
  body: PreferenceRequest
): Promise<CheckoutProPreferenceResult> {
  const safe = applySafeAutoReturnToPreferenceRequest(body);
  const raw = await getPreferenceApi().create({ body: safe });
  const result = preferenceResponseToCheckoutResult(raw, body.external_reference ?? '');
  if (!result.checkoutUrl) {
    throw new MercadoPagoPreferenceError(
      'Mercado Pago não retornou init_point nem sandbox_init_point'
    );
  }
  return result;
}

/** Atalho: back_urls e notification a partir de paths relativos à APP_PUBLIC_URL. */
export function createCheckoutProPreferenceWithAppPaths(
  params: Omit<CreateCheckoutProPreferenceParams, 'notificationUrl' | 'backUrls'> & {
    notificationPath?: string;
    successPath: string;
    pendingPath?: string;
    failurePath?: string;
  }
): Promise<CheckoutProPreferenceResult> {
  const {
    notificationPath = '/api/webhooks/mercadopago',
    successPath,
    pendingPath,
    failurePath,
    ...rest
  } = params;
  return createCheckoutProPreference({
    ...rest,
    notificationUrl: buildAbsoluteUrl(notificationPath),
    backUrls: {
      success: buildAbsoluteUrl(successPath),
      pending: pendingPath ? buildAbsoluteUrl(pendingPath) : undefined,
      failure: failurePath ? buildAbsoluteUrl(failurePath) : undefined,
    },
  });
}

/**
 * Obtém uma preferência pelo id (resposta bruta da API).
 */
export async function getCheckoutProPreference(preferenceId: string): Promise<PreferenceResponse> {
  const id = assertPreferenceId(preferenceId);
  return getPreferenceApi().get({ preferenceId: id });
}

/**
 * Obtém preferência e normaliza para {@link CheckoutProPreferenceResult}.
 */
export async function getCheckoutProPreferenceResult(
  preferenceId: string
): Promise<CheckoutProPreferenceResult> {
  const raw = await getCheckoutProPreference(preferenceId);
  return preferenceResponseToCheckoutResult(raw);
}

/**
 * Atualiza uma preferência existente (corpo completo conforme documentação MP).
 * @see https://www.mercadopago.com.br/developers/pt/reference/preferences/_id/put
 */
export async function updateCheckoutProPreference(
  preferenceId: string,
  updatePreferenceRequest: PreferenceRequest
): Promise<PreferenceResponse> {
  const id = assertPreferenceId(preferenceId);
  const safe = applySafeAutoReturnToPreferenceRequest(updatePreferenceRequest);
  return getPreferenceApi().update({ id, updatePreferenceRequest: safe });
}

/**
 * Atualiza e devolve no formato {@link CheckoutProPreferenceResult}.
 */
export async function updateCheckoutProPreferenceResult(
  preferenceId: string,
  updatePreferenceRequest: PreferenceRequest
): Promise<CheckoutProPreferenceResult> {
  const raw = await updateCheckoutProPreference(preferenceId, updatePreferenceRequest);
  return preferenceResponseToCheckoutResult(raw, updatePreferenceRequest.external_reference ?? '');
}

/**
 * Busca preferências com filtros e paginação (limit/offset e campos da API MP).
 */
export async function searchCheckoutProPreferences(
  searchOptions?: PreferenceSearchOptions
): Promise<PreferenceSearchResponse> {
  if (searchOptions === undefined) {
    return getPreferenceApi().search();
  }
  return getPreferenceApi().search({ options: searchOptions });
}

/**
 * Busca preferências por `external_reference` (atalho comum para conciliar pedidos internos).
 */
export async function searchCheckoutProPreferencesByExternalReference(
  externalReference: string,
  options?: Omit<PreferenceSearchOptions, 'external_reference'>
): Promise<PreferenceSearchResponse> {
  const ref = externalReference?.trim();
  if (!ref) {
    throw new MercadoPagoPreferenceError('externalReference é obrigatório');
  }
  return searchCheckoutProPreferences({ ...options, external_reference: ref });
}
