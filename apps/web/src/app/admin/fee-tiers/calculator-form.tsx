'use client';

import { useState, useTransition } from 'react';
import { formatMoney } from '@/lib/types';
import { previewCalculator, CalculatorPreviewResult } from './actions';

export function CalculatorForm() {
  const [result, setResult] = useState<CalculatorPreviewResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <h3 className="text-sm font-semibold">Customer calculator (preview only, nothing is saved)</h3>
      <form
        action={(formData) => {
          setError(null);
          const gallons = Number(formData.get('gallons'));
          const invoiceDollarVolume = Number(formData.get('invoiceDollarVolume'));
          startTransition(async () => {
            try {
              setResult(await previewCalculator(gallons, invoiceDollarVolume));
            } catch (e) {
              setError(e instanceof Error ? e.message : 'Preview failed');
              setResult(null);
            }
          });
        }}
        className="mt-3 flex items-end gap-3"
      >
        <div>
          <label className="block text-xs text-gray-500">Gallons in (month)</label>
          <input name="gallons" type="number" step="0.001" required className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm" />
        </div>
        <div>
          <label className="block text-xs text-gray-500">Invoice dollar volume (month)</label>
          <input
            name="invoiceDollarVolume"
            type="number"
            step="0.01"
            required
            className="mt-1 rounded border border-gray-300 px-2 py-1 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? 'Calculating…' : 'Preview'}
        </button>
      </form>

      {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

      {result && (
        <dl className="mt-4 grid grid-cols-3 gap-3 text-sm">
          <Stat label="Tier" value={result.tier ? `${result.tier.gallonsFrom}–${result.tier.gallonsTo ?? '∞'} gal` : 'No matching tier'} />
          <Stat label="Fee %" value={`${result.feePct}%`} />
          <Stat label="Invoice volume" value={formatMoney(result.invoiceDollarVolume)} />
          <Stat label="Calculated fee" value={formatMoney(result.calculatedFee)} />
          <Stat
            label="Estimated fee (after minimum)"
            value={`${formatMoney(result.estimatedFee)}${result.minimumFeeShortfallApplied ? ' (minimum applied)' : ''}`}
          />
          <Stat label="Estimated advance" value={formatMoney(result.estimatedAdvance)} />
          <Stat label="Estimated reserve" value={formatMoney(result.estimatedReserve)} />
        </dl>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-400">{label}</dt>
      <dd className="font-medium">{value}</dd>
    </div>
  );
}
