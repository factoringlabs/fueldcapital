import { getSession } from './session';

const API_BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:4000';

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** Server-side fetch helper. Attaches the dev-mode identity header until Cognito is wired up. */
export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const session = getSession();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(session ? { 'x-dev-user-id': session.userId } : {}),
      ...init?.headers,
    },
    cache: 'no-store',
  });

  if (!res.ok) {
    const body = await res.text();
    let message = body || res.statusText;
    try {
      const parsed = JSON.parse(body);
      message = Array.isArray(parsed.message) ? parsed.message.join(', ') : (parsed.message ?? message);
    } catch {
      // Not a JSON error body — fall back to the raw text/status above.
    }
    throw new ApiError(res.status, message);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}
