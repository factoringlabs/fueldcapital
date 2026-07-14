import { apiFetch } from '@/lib/api';
import { BrokerDto } from '@/lib/types';
import { OnboardingEntityType } from '@fueled-capital/shared';
import { transitionOnboarding, reviewKybDoc } from '../../../actions';

interface KybDocDto {
  id: string;
  docType: string;
  reviewStatus: string;
}

export default async function AdminBrokerDetailPage({ params }: { params: { id: string } }) {
  const broker = await apiFetch<BrokerDto>(`/brokers/${params.id}`);
  const docs = await apiFetch<KybDocDto[]>(`/kyb-documents?entityType=BROKER&entityId=${params.id}`);
  const boundTransition = transitionOnboarding.bind(null, OnboardingEntityType.BROKER, params.id);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h2 className="text-lg font-semibold">{broker.legalName}</h2>
        <p className="text-sm text-gray-500">EIN {broker.ein} · Onboarding: {broker.onboardingStatus}</p>
      </div>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">KYB documents</h3>
        <ul className="mt-2 space-y-2 text-sm">
          {docs.map((d) => {
            const boundReview = reviewKybDoc.bind(null, d.id, `/admin/accounts/brokers/${params.id}`);
            return (
              <li key={d.id} className="flex items-center justify-between rounded border border-gray-100 px-3 py-2">
                <span>
                  {d.docType} — {d.reviewStatus}
                </span>
                <form action={boundReview} className="flex items-center gap-2">
                  <select name="reviewStatus" className="rounded border border-gray-300 px-2 py-1 text-xs">
                    <option value="APPROVED">Approve</option>
                    <option value="REJECTED">Reject</option>
                  </select>
                  <button type="submit" className="rounded bg-gray-900 px-2 py-1 text-xs text-white hover:bg-gray-700">
                    Save
                  </button>
                </form>
              </li>
            );
          })}
          {docs.length === 0 && <li className="text-gray-400">No documents submitted yet.</li>}
        </ul>
      </section>

      <section className="rounded-lg border border-gray-200 bg-white p-4">
        <h3 className="text-sm font-semibold">Onboarding decision</h3>
        <form action={boundTransition} className="mt-3 flex items-center gap-2">
          <select name="toStatus" className="rounded border border-gray-300 px-2 py-1 text-sm">
            <option value="UNDER_REVIEW">Start review</option>
            <option value="APPROVED">Approve</option>
            <option value="REJECTED">Reject</option>
            <option value="SUSPENDED">Suspend</option>
          </select>
          <input name="reasonCode" placeholder="Reason (required for reject/suspend)" className="rounded border border-gray-300 px-2 py-1 text-sm" />
          <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
            Apply
          </button>
        </form>
      </section>
    </div>
  );
}
