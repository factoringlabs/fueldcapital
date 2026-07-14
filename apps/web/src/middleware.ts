import { NextRequest, NextResponse } from 'next/server';
import { UserRole } from '@fueled-capital/shared';
import { SESSION_COOKIE, Session } from './lib/session';

const PORTAL_PREFIX: Record<string, UserRole> = {
  '/admin': UserRole.ADMIN,
  '/broker': UserRole.BROKER,
  '/machinery-company': UserRole.MACHINERY_COMPANY,
};

const PORTAL_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.BROKER]: '/broker',
  [UserRole.MACHINERY_COMPANY]: '/machinery-company',
};

/**
 * UX-level route gate keyed on the dev-session cookie's role claim. This
 * does NOT replace API-side authorization — every NestJS route re-checks
 * role + ownership independently (see CognitoAuthGuard/RolesGuard). Once
 * Cognito is wired up (Phase 4), this reads the `cognito:groups` claim from
 * the session/JWT instead of the dev cookie.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const matchedPrefix = Object.keys(PORTAL_PREFIX).find((prefix) => pathname.startsWith(prefix));
  if (!matchedPrefix) return NextResponse.next();

  const raw = request.cookies.get(SESSION_COOKIE)?.value;
  const session: Session | null = raw ? JSON.parse(raw) : null;

  if (!session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const requiredRole = PORTAL_PREFIX[matchedPrefix];
  if (session.role !== requiredRole) {
    return NextResponse.redirect(new URL(PORTAL_HOME[session.role], request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*', '/broker/:path*', '/machinery-company/:path*'],
};
