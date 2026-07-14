import { apiFetch } from '@/lib/api';
import { MachineryCompanyDto } from '@/lib/types';
import { createInvoice } from '../../actions';

export default async function NewInvoicePage() {
  const machineryCompanies = await apiFetch<MachineryCompanyDto[]>('/machinery-companies');

  return (
    <div className="max-w-2xl">
      <h2 className="text-lg font-semibold">Upload invoice</h2>
      <p className="mt-1 text-sm text-gray-500">
        Fields below match the required data set from the brief: invoice number, date, customer, amount, tax,
        gallons, due date, and payment reference. Supporting documents are attached on the next screen.
      </p>
      <form action={createInvoice} className="mt-6 grid grid-cols-2 gap-4">
        <Field label="Invoice number" name="invoiceNumber" required />
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
        <Field label="Invoice date" name="invoiceDate" type="date" required />
        <Field label="Due date" name="dueDate" type="date" required />
        <Field label="Billed amount ($)" name="billedAmount" type="number" step="0.01" required />
        <Field label="Tax amount ($)" name="taxAmount" type="number" step="0.01" defaultValue="0" />
        <Field label="Gallons" name="gallons" type="number" step="0.001" required />
        <Field label="Payment reference" name="paymentReference" />
        <button type="submit" className="col-span-2 rounded bg-gray-900 py-2 text-white hover:bg-gray-700">
          Create invoice
        </button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  type = 'text',
  required,
  ...rest
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  step?: string;
  defaultValue?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium">{label}</label>
      <input
        name={name}
        type={type}
        required={required}
        className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
        {...rest}
      />
    </div>
  );
}
