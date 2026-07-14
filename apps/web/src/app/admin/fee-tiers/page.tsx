import { apiFetch } from '@/lib/api';
import { BrokerDto, formatMoney } from '@/lib/types';
import { CalculatorForm } from './calculator-form';
import { createFeeTier, deactivateFeeTier, setMinimumFee, runFeeAccrual } from './actions';

interface FeeTierDto {
  id: string;
  gallonsFrom: string;
  gallonsTo: string | null;
  feePct: string;
  notes: string | null;
}

export default async function FeeTiersPage() {
  const [tiers, minimumFee, brokers] = await Promise.all([
    apiFetch<FeeTierDto[]>('/admin/fee-tiers'),
    apiFetch<string>('/admin/fee-tiers/minimum-fee'),
    apiFetch<BrokerDto[]>('/brokers'),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <h2 className="text-lg font-semibold">Fee tiers & calculator</h2>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Gallon bands → fee %</h3>
        <table className="mt-3 w-full text-sm">
          <thead className="text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="py-1">From</th>
              <th className="py-1">To</th>
              <th className="py-1">Fee %</th>
              <th className="py-1">Notes</th>
              <th className="py-1"></th>
            </tr>
          </thead>
          <tbody>
            {tiers.map((t) => {
              const bound = deactivateFeeTier.bind(null, t.id);
              return (
                <tr key={t.id} className="border-t border-gray-100">
                  <td className="py-1">{t.gallonsFrom}</td>
                  <td className="py-1">{t.gallonsTo ?? '∞'}</td>
                  <td className="py-1">{t.feePct}%</td>
                  <td className="py-1 text-gray-500">{t.notes ?? '—'}</td>
                  <td className="py-1">
                    <form action={bound}>
                      <button type="submit" className="text-xs text-red-600 hover:underline">
                        Deactivate
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {tiers.length === 0 && (
              <tr>
                <td colSpan={5} className="py-4 text-center text-gray-400">
                  No fee tiers configured yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <form action={createFeeTier} className="mt-4 flex flex-wrap items-end gap-2 border-t border-gray-100 pt-4">
          <Field label="From (gal)" name="gallonsFrom" type="number" step="0.001" required />
          <Field label="To (gal, blank = ∞)" name="gallonsTo" type="number" step="0.001" />
          <Field label="Fee %" name="feePct" type="number" step="0.001" required />
          <Field label="Notes" name="notes" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Add tier
          </button>
        </form>
        <p className="mt-2 text-xs text-gray-500">
          To edit an existing band, add the corrected one and deactivate the old — history stays versioned so past
          fee calculations don&apos;t change retroactively.
        </p>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Minimum monthly program fee</h3>
        <p className="mt-1 text-sm text-gray-500">Currently {formatMoney(minimumFee)}</p>
        <form action={setMinimumFee} className="mt-3 flex items-center gap-2">
          <input name="minimumMonthlyFee" type="number" step="0.01" required className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Save
          </button>
        </form>
      </section>

      <CalculatorForm />

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Run monthly fee accrual</h3>
        <p className="mt-1 text-xs text-gray-500">
          Stand-in for the Phase 4 scheduled Lambda — accrues fees for every invoice outstanding during the period
          (including invoices carried over from an earlier month) and rolls them into a per-Broker fee invoice.
        </p>
        <form action={runFeeAccrual} className="mt-3 flex items-end gap-2">
          <Field label="Period month" name="periodMonth" type="date" required />
          <div>
            <label className="block text-xs text-gray-500">Broker (blank = all)</label>
            <select name="brokerId" className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm">
              <option value="">All brokers</option>
              {brokers.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.legalName}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Run
          </button>
        </form>
      </section>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  step,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
}) {
  return (
    <div>
      <label className="block text-xs text-gray-500">{label}</label>
      <input name={name} type={type} required={required} step={step} className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm" />
    </div>
  );
}
