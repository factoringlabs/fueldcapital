import Link from 'next/link';
import { apiFetch } from '@/lib/api';
import { BrokerDto, MachineryCompanyDto } from '@/lib/types';
import { createBroker, createMachineryCompany, inviteUser } from '../actions';
import { UserRole } from '@fueled-capital/shared';

export default async function AdminAccountsPage() {
  const [brokers, machineryCompanies] = await Promise.all([
    apiFetch<BrokerDto[]>('/brokers'),
    apiFetch<MachineryCompanyDto[]>('/machinery-companies'),
  ]);

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
      <section>
        <h2 className="mb-2 text-lg font-semibold">Brokers</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {brokers.map((b) => (
            <li key={b.id} className="flex justify-between rounded border border-gray-200 bg-white px-3 py-2">
              <Link href={`/admin/accounts/brokers/${b.id}`} className="text-blue-600 hover:underline">
                {b.legalName}
              </Link>
              <span className="text-gray-500">{b.onboardingStatus}</span>
            </li>
          ))}
        </ul>
        <form action={createBroker} className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Invite new Broker</h3>
          <input name="legalName" placeholder="Legal name" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="dba" placeholder="DBA (optional)" className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="ein" placeholder="EIN" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Create Broker
          </button>
        </form>
      </section>

      <section>
        <h2 className="mb-2 text-lg font-semibold">Machinery Companies</h2>
        <ul className="mb-4 space-y-1 text-sm">
          {machineryCompanies.map((mc) => (
            <li key={mc.id} className="flex justify-between rounded border border-gray-200 bg-white px-3 py-2">
              <Link href={`/admin/accounts/machinery-companies/${mc.id}`} className="text-blue-600 hover:underline">
                {mc.legalName}
              </Link>
              <span className="text-gray-500">{mc.onboardingStatus}</span>
            </li>
          ))}
        </ul>
        <form action={createMachineryCompany} className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Invite new Machinery Company</h3>
          <input name="legalName" placeholder="Legal name" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <input name="ein" placeholder="EIN" required className="w-full rounded border border-gray-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Create Machinery Company
          </button>
        </form>
      </section>

      <section className="lg:col-span-2">
        <form action={inviteUser} className="space-y-2 rounded-lg border border-gray-200 bg-white p-4">
          <h3 className="text-sm font-semibold">Link a Cognito user to a role (portal login)</h3>
          <p className="text-xs text-gray-500">
            Real Cognito user creation is wired up in Phase 4. For now, paste the Cognito sub (or a placeholder in
            local dev) to link a login to a Broker or Machinery Company account.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <input name="cognitoSub" placeholder="Cognito sub" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
            <input name="email" type="email" placeholder="Email" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
            <select name="role" className="rounded border border-gray-300 px-2 py-1 text-sm">
              <option value={UserRole.BROKER}>Broker</option>
              <option value={UserRole.MACHINERY_COMPANY}>Machinery Company</option>
              <option value={UserRole.ADMIN}>Admin</option>
            </select>
            <input name="brokerId" placeholder="Broker id (if Broker role)" className="rounded border border-gray-300 px-2 py-1 text-sm" />
            <input
              name="machineryCompanyId"
              placeholder="Machinery Company id (if that role)"
              className="rounded border border-gray-300 px-2 py-1 text-sm"
            />
          </div>
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Create login
          </button>
        </form>
      </section>
    </div>
  );
}
