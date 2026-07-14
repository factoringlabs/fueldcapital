'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { UserRole } from '@fueled-capital/shared';
import { SESSION_COOKIE } from '@/lib/session';

const PORTAL_HOME: Record<UserRole, string> = {
  [UserRole.ADMIN]: '/admin',
  [UserRole.BROKER]: '/broker',
  [UserRole.MACHINERY_COMPANY]: '/machinery-company',
};

/**
 * Dev-mode sign-in: trusts a pasted AppUser id (from `npm run seed` output)
 * and role, and stores them in a cookie for middleware + apiFetch to read.
 * Replaced by real Cognito Hosted UI login in Phase 4.
 */
export async function devSignIn(formData: FormData) {
  const userId = String(formData.get('userId') ?? '').trim();
  const email = String(formData.get('email') ?? '').trim();
  const role = String(formData.get('role') ?? '') as UserRole;

  if (!userId || !role) {
    redirect('/login?error=missing-fields');
  }

  cookies().set(SESSION_COOKIE, JSON.stringify({ userId, email, role }), {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
  });

  redirect(PORTAL_HOME[role] ?? '/login');
}

export async function signOut() {
  cookies().delete(SESSION_COOKIE);
  redirect('/login');
}
