import { PortalShell } from '@/components/portal-shell';

export default function BrokerLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      title="Broker Portal"
      navItems={[
        { href: '/broker', label: 'Dashboard' },
        { href: '/broker/invoices', label: 'Invoices' },
        { href: '/broker/invoices/new', label: 'Upload Invoice' },
        { href: '/broker/fee-invoices', label: 'Fee Invoices' },
        { href: '/broker/statement', label: 'Statement of Account' },
        { href: '/broker/onboarding', label: 'KYB Onboarding' },
      ]}
    >
      {children}
    </PortalShell>
  );
}
