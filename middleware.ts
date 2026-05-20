import { NextRequest, NextResponse } from 'next/server';

// Optional Basic Auth. Activate by setting BASIC_AUTH_USER and BASIC_AUTH_PASS
// in env. Without these, the app is open.
//
// Useful for a "ребята тыкают" demo on Railway без публичного индексирования.

const USER = process.env.BASIC_AUTH_USER;
const PASS = process.env.BASIC_AUTH_PASS;

export function middleware(req: NextRequest) {
  if (!USER || !PASS) return NextResponse.next();

  const header = req.headers.get('authorization');
  if (header?.startsWith('Basic ')) {
    const decoded = atob(header.slice(6));
    const [u, p] = decoded.split(':');
    if (u === USER && p === PASS) return NextResponse.next();
  }
  return new NextResponse('Auth required', {
    status: 401,
    headers: { 'WWW-Authenticate': 'Basic realm="Rovena Analytics"' },
  });
}

export const config = {
  matcher: ['/((?!_next|favicon.ico|api/health).*)'],
};
