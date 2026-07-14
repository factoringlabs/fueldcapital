import { apiFetch } from '@/lib/api';

interface AuditLogDto {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorUserId: string | null;
  reasonCode: string | null;
  createdAt: string;
}

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: { entityType?: string; entityId?: string };
}) {
  const params = new URLSearchParams();
  if (searchParams.entityType) params.set('entityType', searchParams.entityType);
  if (searchParams.entityId) params.set('entityId', searchParams.entityId);
  const query = params.toString();

  const entries = await apiFetch<AuditLogDto[]>(`/admin/audit-log${query ? `?${query}` : ''}`);

  return (
    <div>
      <h2 className="mb-4 text-lg font-semibold">Audit log</h2>

      <form method="GET" className="mb-4 flex items-center gap-2">
        <input
          name="entityType"
          defaultValue={searchParams.entityType}
          placeholder="Entity type (e.g. Invoice, Onboarding:BROKER, FeeTier)"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <input
          name="entityId"
          defaultValue={searchParams.entityId}
          placeholder="Entity id"
          className="rounded border border-gray-300 px-2 py-1 text-sm"
        />
        <button type="submit" className="rounded bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-gray-700">
          Filter
        </button>
        {(searchParams.entityType || searchParams.entityId) && (
          <a href="/admin/audit-log" className="text-sm text-gray-500 hover:underline">
            Clear
          </a>
        )}
      </form>

      <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-2">When</th>
              <th className="px-4 py-2">Entity</th>
              <th className="px-4 py-2">Action</th>
              <th className="px-4 py-2">Actor</th>
              <th className="px-4 py-2">Reason</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-gray-100">
                <td className="px-4 py-2 whitespace-nowrap">{new Date(e.createdAt).toLocaleString()}</td>
                <td className="px-4 py-2">
                  {e.entityType} <span className="text-gray-400">{e.entityId.slice(0, 8)}</span>
                </td>
                <td className="px-4 py-2">{e.action}</td>
                <td className="px-4 py-2">{e.actorUserId?.slice(0, 8) ?? 'system'}</td>
                <td className="px-4 py-2">{e.reasonCode ?? '—'}</td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-gray-400">
                  No audit entries match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
