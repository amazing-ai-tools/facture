export const productionApiBaseUrl = 'https://facture.api.amazing-ai.tools';

export function resolveApiBaseUrl(configuredUrl = import.meta.env.VITE_API_BASE_URL, hostname = window.location.hostname) {
  if (configuredUrl) {
    return configuredUrl.replace(/\/$/, '');
  }

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://localhost:4000';
  }

  return productionApiBaseUrl;
}

const apiBaseUrl = resolveApiBaseUrl();

export { apiBaseUrl };

export interface CurrentUserResponse {
  user: {
    id: string;
    email: string;
  };
}

export function loginWithGoogle() {
  window.location.href = `${apiBaseUrl}/auth/google/start`;
}

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, { credentials: 'include' });
  return parseJsonResponse<T>(response);
}

export async function postJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<TResponse>(response);
}

export async function patchJson<TResponse, TBody>(path: string, body: TBody): Promise<TResponse> {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    method: 'PATCH',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  return parseJsonResponse<TResponse>(response);
}

export function getInvoicePdfPreviewUrl(invoiceId: string) {
  return `${apiBaseUrl}/invoices/${invoiceId}/pdf`;
}

export function sendInvoice(invoiceId: string) {
  return postJson<{ emailMessageId: string | null }, Record<string, never>>(`/invoices/${invoiceId}/send`, {});
}

async function parseJsonResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = '';
    try {
      const body = (await response.json()) as { error?: string };
      detail = body.error ? `: ${body.error}` : '';
    } catch {
      detail = '';
    }
    throw new Error(`Request failed with ${response.status}${detail}`);
  }

  return response.json() as Promise<T>;
}
