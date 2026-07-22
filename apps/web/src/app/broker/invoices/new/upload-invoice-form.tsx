'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { MachineryCompanyDto } from '@/lib/types';
import { createInvoice, uploadAndPreview } from '../../actions';

type ExtractedFields = {
  invoiceNumber?: string;
  invoiceDate?: string;
  dueDate?: string;
  billedAmount?: number;
  taxAmount?: number;
  gallons?: number;
  paymentReference?: string;
};

type PreviewResult = {
  stagingS3Key: string;
  docType: string;
  extractedFields: ExtractedFields;
  confidenceScores: Partial<Record<keyof ExtractedFields, number>>;
};

export function UploadInvoiceForm({ machineryCompanies }: { machineryCompanies: MachineryCompanyDto[] }) {
  const router = useRouter();
  const [preview, setPreview] = useState<PreviewResult | null>(null);
  const [machineryCompanyId, setMachineryCompanyId] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isConfirming, startConfirming] = useTransition();

  async function handleUpload(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      try {
        const result = await uploadAndPreview(formData);
        setMachineryCompanyId(formData.get('machineryCompanyId') as string);
        setPreview(result);
      } catch {
        setError('Could not read the document. You can still enter the details manually below.');
        setPreview({
          stagingS3Key: '',
          docType: (formData.get('docType') as string) || 'INVOICE',
          extractedFields: {},
          confidenceScores: {},
        });
        setMachineryCompanyId(formData.get('machineryCompanyId') as string);
      }
    });
  }

  async function handleConfirm(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setConfirmError(null);
    const formData = new FormData(e.currentTarget);
    startConfirming(async () => {
      const result = await createInvoice(formData);
      if (result.ok) {
        router.push(`/broker/invoices/${result.id}`);
      } else {
        setConfirmError(result.error);
      }
    });
  }

  if (!preview) {
    return (
      <form onSubmit={handleUpload} className="mt-6 space-y-4">
        <div>
          <label className="block text-sm font-medium">Machinery Company</label>
          <select name="machineryCompanyId" required className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
            {machineryCompanies.map((mc) => (
              <option key={mc.id} value={mc.id}>
                {mc.legalName} ({mc.onboardingStatus})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Document type</label>
          <select name="docType" className="mt-1 w-full rounded border border-gray-300 px-3 py-2">
            <option value="INVOICE">Invoice</option>
            <option value="POD">Proof of delivery</option>
            <option value="DELIVERY_TICKET">Delivery ticket</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium">Invoice document</label>
          <input type="file" name="file" required className="mt-1 w-full text-sm" />
          <p className="mt-1 text-xs text-gray-500">
            We&apos;ll read the invoice number, dates, amounts, and gallons off this automatically — you&apos;ll get
            a chance to check them on the next screen.
          </p>
        </div>
        <button
          type="submit"
          disabled={isPending}
          className="rounded bg-gray-900 py-2 px-4 text-white hover:bg-gray-700 disabled:opacity-50"
        >
          {isPending ? 'Reading document…' : 'Upload & read document'}
        </button>
      </form>
    );
  }

  const fields = preview.extractedFields;
  const confidence = preview.confidenceScores;
  const lowConfidence = (key: keyof ExtractedFields) => confidence[key] !== undefined && confidence[key]! < 0.6;

  return (
    <form onSubmit={handleConfirm} className="mt-6 grid grid-cols-2 gap-4">
      <input type="hidden" name="machineryCompanyId" value={machineryCompanyId} />
      <input type="hidden" name="stagingS3Key" value={preview.stagingS3Key} />
      <input type="hidden" name="docType" value={preview.docType} />

      {confirmError && <p className="col-span-2 rounded bg-red-50 px-3 py-2 text-sm text-red-800">{confirmError}</p>}
      {error && !confirmError && (
        <p className="col-span-2 rounded bg-amber-50 px-3 py-2 text-sm text-amber-800">{error}</p>
      )}
      {!error && !confirmError && (
        <p className="col-span-2 text-sm text-gray-500">
          Fields below are read from the document — double-check them, especially anything highlighted, then confirm.
        </p>
      )}

      <Field label="Invoice number" name="invoiceNumber" defaultValue={fields.invoiceNumber} flagged={lowConfidence('invoiceNumber')} required />
      <Field label="Invoice date" name="invoiceDate" type="date" defaultValue={fields.invoiceDate} flagged={lowConfidence('invoiceDate')} required />
      <Field label="Due date" name="dueDate" type="date" defaultValue={fields.dueDate} flagged={lowConfidence('dueDate')} required />
      <Field
        label="Billed amount ($)"
        name="billedAmount"
        type="number"
        step="0.01"
        defaultValue={fields.billedAmount}
        flagged={lowConfidence('billedAmount')}
        required
      />
      <Field
        label="Tax amount ($)"
        name="taxAmount"
        type="number"
        step="0.01"
        defaultValue={fields.taxAmount ?? 0}
        flagged={lowConfidence('taxAmount')}
      />
      <Field label="Gallons" name="gallons" type="number" step="0.001" defaultValue={fields.gallons} flagged={lowConfidence('gallons')} required />
      <Field label="Payment reference" name="paymentReference" defaultValue={fields.paymentReference} flagged={lowConfidence('paymentReference')} />

      <button
        type="submit"
        disabled={isConfirming}
        className="col-span-2 rounded bg-gray-900 py-2 text-white hover:bg-gray-700 disabled:opacity-50"
      >
        {isConfirming ? 'Creating invoice…' : 'Confirm and create invoice'}
      </button>
    </form>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  flagged,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  flagged?: boolean;
  step?: string;
  defaultValue?: string | number;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">
        {label}
        {flagged && <span className="ml-2 text-xs font-normal text-amber-600">check this</span>}
      </label>
      <input
        name={name}
        type={type}
        required={required}
        className={`mt-1 w-full rounded border px-3 py-2 ${flagged ? 'border-amber-400 bg-amber-50' : 'border-gray-300'}`}
        {...rest}
      />
    </div>
  );
}
