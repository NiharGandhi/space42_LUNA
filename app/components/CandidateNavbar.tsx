'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Briefcase, FileText, LogOut } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';

const navItems = [
  { href: '/my-dashboard', label: 'Dashboard' },
  { href: '/my-applications', label: 'Applications' },
];

export function CandidateNavbar() {
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
      <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between gap-4">
        <Link href="/my-dashboard" className="flex items-center gap-3">
          <img src="/logo.svg" alt="Space42" className="h-8 w-auto" />
          <div>
            <span className="block text-[15px] font-semibold text-slate-900">Candidate</span>
            <span className="block text-[11px] font-medium text-slate-500">Your applications</span>
          </div>
        </Link>

        <nav className="flex items-center gap-0.5">
          {navItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== '/my-dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  isActive
                    ? 'text-slate-900 bg-slate-100'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
          <Link
            href="/career"
            className="px-3 py-2 text-[13px] font-medium text-slate-500 hover:text-slate-900 rounded-lg hover:bg-slate-100/80 transition-colors flex items-center gap-1.5"
          >
            <Briefcase className="h-4 w-4" />
            Browse jobs
          </Link>
        </nav>

        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' });
              router.replace('/');
            }}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-700 transition-colors"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </header>
  );
}
