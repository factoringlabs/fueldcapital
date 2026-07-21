import { apiFetch } from '@/lib/api';
import { MachineryCompanyDto } from '@/lib/types';
import { UploadInvoiceForm } from './upload-invoice-form';

export default async function NewInvoicePage() {
  const machineryCompanies = await apiFetch<MachineryCompanyDto[]>('/machinery-companies');

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Upload invoice</h2>
      <p className="mt-1 text-sm text-gray-500">
        Upload the invoice document and we&apos;ll read the key details off it automatically — you confirm they&apos;re
        correct before the invoice is created.
      </p>
      <UploadInvoiceForm machineryCompanies={machineryCompanies} />
    </div>
  );
}
