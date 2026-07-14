import { cookies } from 'next/headers';
import { UserRole } from '@fueled-capital/shared';

export const SESSION_COOKIE = 'fc_session';

export interface Session {
  userId: string;
  role: UserRole;
  email: string;
}

/**
 * Reads the dev-mode session cookie set by /login. This is a UX-level
 * convenience only — the real authorization boundary is the NestJS API,
 * which independently re-derives role/ownership from the AppUser row on
 * every request (see CognitoAuthGuard). Once Cognito Hosted UI is wired up
 * (Phase 4), this is replaced by reading the Cognito session/JWT instead.
 */
export function getSession(): Session | null {
  const raw = cookies().get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
