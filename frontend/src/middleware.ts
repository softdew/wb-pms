import { NextRequest, NextResponse } from 'next/server';

/**
 * Passes the current path to server components as a header, so the navigation
 * can mark the active entry without becoming a client component.
 */
export function middleware(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-pathname', request.nextUrl.pathname);

  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
