import { NextRequest, NextResponse } from 'next/server';
import { getToken } from '@/lib/session';

const BASE = process.env.API_URL ?? 'http://localhost:8000/api';

/**
 * Passes browser requests through to Laravel with the bearer token attached.
 *
 * Client components need to reach the API for filtering and mutations, and the
 * token is in an httpOnly cookie they cannot read. Rather than exposing it,
 * they call /api/proxy/... and the token is added here.
 */
async function forward(request: NextRequest, path: string[]): Promise<NextResponse> {
  const token = await getToken();

  if (!token) {
    return NextResponse.json({ message: 'Not signed in.' }, { status: 401 });
  }

  const url = new URL(`${BASE.replace(/\/$/, '')}/${path.join('/')}`);
  request.nextUrl.searchParams.forEach((value, key) => url.searchParams.set(key, value));

  const body = ['GET', 'HEAD'].includes(request.method) ? undefined : await request.text();

  const response = await fetch(url, {
    method: request.method,
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body,
    cache: 'no-store',
  });

  const payload = await response.text();

  return new NextResponse(payload, {
    status: response.status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function GET(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await ctx.params).path);
}

export async function POST(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await ctx.params).path);
}

export async function PUT(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await ctx.params).path);
}

export async function DELETE(request: NextRequest, ctx: { params: Promise<{ path: string[] }> }) {
  return forward(request, (await ctx.params).path);
}
