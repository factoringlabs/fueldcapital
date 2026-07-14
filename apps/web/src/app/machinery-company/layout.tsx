import { PortalShell } from '@/components/portal-shell';

export default function MachineryCompanyLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      title="Machinery Company Portal"
      navItems={[
        { href: '/machinery-company', label: 'Dashboard' },
        { href: '/machinery-company/invoices', label: 'Invoice Approvals' },
        { href: '/machinery-company/payments', label: 'Payment History' },
        { href: '/machinery-company/onboarding', label: 'KYC Onboarding' },
      ]}
    >
      {children}
    </PortalShell>
  );
}
