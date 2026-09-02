import { getToken } from '@/lib/session';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public errors?: Record<string, string[]>,
  ) {
    super(message);
  }

  /** A refused domain rule -- the maintenance logic declining, not a fault. */
  get isRuleViolation(): boolean {
    return this.status === 422;
  }
}

interface Options extends RequestInit {
  /** Query parameters, with undefined and empty values dropped. */
  query?: Record<string, string | number | boolean | undefined | null>;
}

/**
 * Server-side call to the Laravel API. Attaches the bearer token from the
 * cookie; the browser never sees it.
 */
export async function api<T>(path: string, options: Options = {}): Promise<T> {
  const { query, headers, ...init } = options;
  const token = await getToken();

  const url = new URL(BASE.replace(/\/$/, '') + path);

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }
  }

  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    // Maintenance data changes as work is recorded; nothing here is cacheable.
    cache: 'no-store',
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));

    throw new ApiError(
      response.status,
      body.message ?? `Request failed (${response.status})`,
      body.errors,
    );
  }

  return response.status === 204 ? (undefined as T) : response.json();
}

export const get = <T>(path: string, query?: Options['query']) => api<T>(path, { query });

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body ? JSON.stringify(body) : undefined });

export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) });

export const del = <T>(path: string) => api<T>(path, { method: 'DELETE' });
