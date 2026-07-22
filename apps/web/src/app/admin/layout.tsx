import { PortalShell } from '@/components/portal-shell';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <PortalShell
      title="Admin Portal"
      navItems={[
        { href: '/admin', label: 'Dashboard' },
        { href: '/admin/underwriting', label: 'Underwriting Queue' },
        { href: '/admin/invoices', label: 'Invoices' },
        { href: '/admin/payments', label: 'Payments' },
        { href: '/admin/ledger', label: 'Ledger' },
        { href: '/admin/fee-tiers', label: 'Fee Tiers' },
        { href: '/admin/accounts', label: 'Accounts' },
        { href: '/admin/audit-log', label: 'Audit Log' },
      ]}
    >
      {children}
    </PortalShell>
  );
}
