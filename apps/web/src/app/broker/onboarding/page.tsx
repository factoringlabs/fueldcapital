import { apiFetch } from '@/lib/api';
import { AuthenticatedUserDto } from '@/lib/types';
import { uploadKybDoc, markDocsSubmitted } from './actions';

export default async function BrokerOnboardingPage() {
  const me = await apiFetch<AuthenticatedUserDto>('/me');
  const broker = await apiFetch<{ id: string; legalName: string; onboardingStatus: string }>(
    `/brokers/${me.brokerId}`,
  );
  const docs = await apiFetch<{ id: string; docType: string; reviewStatus: string }[]>(
    `/kyb-documents?entityType=BROKER&entityId=${me.brokerId}`,
  );
  const boundUpload = uploadKybDoc.bind(null, me.brokerId!);
  const boundSubmit = markDocsSubmitted.bind(null, me.brokerId!);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">KYB Onboarding — {broker.legalName}</h2>
        <p className="mt-1 text-sm text-gray-500">
          Status: <span className="font-medium">{broker.onboardingStatus}</span>. Invoices cannot be uploaded until
          this is APPROVED.
        </p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Upload KYB document</h3>
        <form action={boundUpload} className="mt-3 flex items-center gap-3">
          <select name="docType" className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="BUSINESS_LICENSE">Business license</option>
            <option value="EIN_LETTER">EIN letter</option>
            <option value="BANK_VERIFICATION">Bank verification</option>
            <option value="OTHER">Other</option>
          </select>
          <input type="file" name="file" required className="text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Upload
          </button>
        </form>

        <ul className="mt-4 space-y-1 text-sm">
          {docs.map((d) => (
            <li key={d.id} className="flex justify-between rounded border border-gray-100 px-3 py-1.5">
              <span>{d.docType}</span>
              <span className="text-gray-500">{d.reviewStatus}</span>
            </li>
          ))}
          {docs.length === 0 && <li className="text-gray-400">No documents uploaded yet.</li>}
        </ul>

        {broker.onboardingStatus === 'INVITED' || broker.onboardingStatus === 'REJECTED' ? (
          <form action={boundSubmit} className="mt-4">
            <button type="submit" className="rounded bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-500">
              Submit documents for review
            </button>
          </form>
        ) : null}
      </section>
    </div>
  );
}
