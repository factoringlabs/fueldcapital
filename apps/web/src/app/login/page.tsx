import { UserRole } from '@fueled-capital/shared';
import { devSignIn } from './actions';

export default function LoginPage() {
  return (
    <main className="mx-auto mt-24 max-w-md rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
      <h1 className="text-xl font-semibold">Fueled Capital — Dev Sign-In</h1>
      <p className="mt-2 text-sm text-gray-500">
        Cognito Hosted UI isn&apos;t wired up yet (Phase 4). Paste an AppUser id from{' '}
        <code className="rounded bg-gray-100 px-1">npm run seed --workspace apps/api</code> to sign in as that user.
      </p>
      <form action={devSignIn} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">AppUser id</label>
          <input name="userId" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Email (display only)</label>
          <input name="email" className="mt-1 w-full rounded border border-gray-300 px-3 py-2" />
        </div>
        <div>
          <label className="block text-sm font-medium">Role</label>
          <select name="role" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
            <option value={UserRole.ADMIN}>Admin</option>
            <option value={UserRole.BROKER}>Broker</option>
            <option value={UserRole.MACHINERY_COMPANY}>Machinery Company</option>
          </select>
        </div>
        <button type="submit" className="w-full rounded bg-gray-900 py-2 text-white hover:bg-gray-700">
          Sign in
        </button>
      </form>
    </main>
  );
}
