'use client';

export function PortalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto mt-16 max-w-lg rounded-lg border border-red-200 bg-red-50 p-6 text-center">
      <h2 className="text-sm font-semibold text-red-800">Action failed</h2>
      <p className="mt-2 whitespace-pre-wrap text-sm text-red-700">{error.message}</p>
      <button
        onClick={reset}
        className="mt-4 rounded bg-red-600 px-4 py-1.5 text-sm text-white hover:bg-red-500"
      >
        Try again
      </button>
    </div>
  );
}
