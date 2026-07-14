import { signOut } from '@/app/login/actions';

export function PortalShell({
  title,
  navItems,
  children,
}: {
  title: string;
  navItems: { href: string; label: string }[];
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <header className="border-b border-gray-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div>
            <p className="text-xs uppercase tracking-wide text-gray-400">Fueled Capital</p>
            <h1 className="text-lg font-semibold">{title}</h1>
          </div>
          <nav className="flex items-center gap-4 text-sm">
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="text-gray-600 hover:text-gray-900">
                {item.label}
              </a>
            ))}
            <form action={signOut}>
              <button type="submit" className="text-gray-400 hover:text-gray-700">
                Sign out
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  );
}
