'use client';
import { useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useAuthUser, getToken, logout } from '@/lib/api';
import { Avatar } from '@/components/ui';

const NAV = [
  { href: '/dashboard', label: 'Dashboard', title: 'Dashboard' },
  { href: '/leads', label: 'Leads', title: 'Leads' },
  { href: '/sellers', label: 'Sellers', title: 'Sellers', adminOnly: true },
];

export default function AppLayout({ children }) {
  const path = usePathname();
  const router = useRouter();
  const user = useAuthUser();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const token = getToken();
      if (!token) {
        router.replace('/login');
      }
    }
  }, [router]);

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 text-slate-500">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-medium">Checking authentication...</span>
        </div>
      </div>
    );
  }

  const nav = NAV.filter((n) => !n.adminOnly || user.role === 'admin');
  const current = nav.find((n) => path.startsWith(n.href));

  return (
    <div className="min-h-screen md:flex bg-slate-50">
      <aside className="bg-slate-900 text-slate-300 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 flex flex-col justify-between">
        <div>
          <div className="flex items-center gap-3 px-5 py-5 border-b border-slate-800">
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-tr from-indigo-500 to-violet-500 text-base font-bold text-white shadow-md shadow-indigo-500/20">L</span>
            <div>
              <span className="text-base font-bold text-white tracking-tight">Leadflow CRM</span>
              <span className="block text-[11px] text-slate-400">Sales & Pipeline</span>
            </div>
          </div>
          <nav className="flex gap-1 overflow-x-auto p-3 md:flex-col">
            {nav.map((n) => (
              <Link key={n.href} href={n.href}
                className={`whitespace-nowrap rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${path.startsWith(n.href) ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-slate-800 hover:text-white'}`}>
                {n.label}
              </Link>
            ))}
          </nav>
        </div>

        <div className="hidden md:block p-3 border-t border-slate-800">
          <div className="flex items-center justify-between px-3 py-2 text-xs text-slate-400">
            <span>Logged in as</span>
            <span className="capitalize font-semibold text-slate-300">{user.role}</span>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-slate-200 bg-white/90 px-4 backdrop-blur md:px-8">
          <h2 className="text-lg font-bold text-slate-900">{current?.title || 'CRM'}</h2>
          <details className="relative">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-slate-100 transition-colors">
              <Avatar name={user.name} className="h-9 w-9 text-sm" />
              <span className="hidden text-left sm:block">
                <span className="block text-sm font-medium leading-tight text-slate-900">{user.name}</span>
                <span className="block text-xs capitalize leading-tight text-slate-500">{user.role}</span>
              </span>
            </summary>
            <div className="absolute right-0 mt-2 w-56 rounded-xl border border-slate-200 bg-white p-2 shadow-xl z-50">
              <div className="px-3 py-2 border-b border-slate-100">
                <div className="text-sm font-semibold text-slate-900">{user.name}</div>
                <div className="truncate text-xs text-slate-500">{user.email}</div>
                <span className={`mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${user.role === 'admin' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'}`}>{user.role}</span>
              </div>
              <button onClick={logout} className="mt-1 w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors">Logout</button>
            </div>
          </details>
        </header>
        <main className="p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
