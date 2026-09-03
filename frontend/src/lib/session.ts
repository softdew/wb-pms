import 'server-only';
import { cookies } from 'next/headers';

const TOKEN = 'wbpms_token';

/**
 * The bearer token lives in an httpOnly cookie, so no script on the page can
 * read it. Every call to Laravel happens on the server or through the proxy
 * route, which attaches the token itself.
 *
 * The server-only import makes a client component that reaches this fail at
 * build time with a clear message, rather than at runtime with a confusing one
 * about the pages directory.
 */
export async function getToken(): Promise<string | null> {
  return (await cookies()).get(TOKEN)?.value ?? null;
}

export async function setToken(token: string): Promise<void> {
  (await cookies()).set(TOKEN, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 12,
  });
}

export async function clearToken(): Promise<void> {
  (await cookies()).delete(TOKEN);
}
