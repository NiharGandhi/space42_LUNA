'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Plus, Search, Menu, X } from 'lucide-react';
import { NotificationBell } from '@/components/NotificationBell';
import { cn } from '@/lib/utils/cn';

const navItems = [
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/dashboard/agent', label: 'AI Agent' },
  { href: '/jobs', label: 'Jobs' },
  { href: '/applications', label: 'Applications' },
  { href: '/settings/onboarding', label: 'Settings' },
];

export function HRNavbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200/80 bg-white/95 backdrop-blur-md shadow-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <img src="/logo.svg" alt="Space42" className="h-7 sm:h-8 w-auto" />
            <div className="hidden sm:block">
              <span className="block text-[15px] font-semibold text-slate-900 tracking-tight">HR</span>
              <span className="block text-[11px] font-medium text-slate-500">Hiring & Onboarding</span>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-0.5">
            {navItems.map((item) => {
              const isActive =
                pathname === item.href ||
                (item.href !== '/dashboard' && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'px-4 py-2.5 text-[13px] font-medium rounded-lg transition-colors',
                    isActive
                      ? 'text-slate-900 bg-slate-100'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          {/* Desktop search - visible on xl */}
          <div className="hidden xl:flex flex-1 max-w-sm justify-center px-4">
            <div className="flex items-center gap-2 w-full px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-500 focus-within:ring-2 focus-within:ring-slate-900/5 focus-within:border-slate-300">
              <Search className="h-4 w-4 shrink-0" />
              <input
                type="search"
                placeholder="Search jobs, applicants…"
                className="flex-1 min-w-0 bg-transparent text-[13px] outline-none placeholder:text-slate-400"
              />
            </div>
          </div>

          {/* Right: Notifications + Post Job */}
          <div className="flex items-center gap-2 sm:gap-3">
            <NotificationBell />
            <Link
              href="/jobs/create"
              className="inline-flex items-center gap-2 px-3 sm:px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">Post Job</span>
            </Link>
            {/* Mobile menu toggle */}
            <button
              type="button"
              onClick={() => setMobileOpen((o) => !o)}
              className="lg:hidden inline-flex items-center justify-center p-2 rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileOpen}
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div
            className="lg:hidden border-t border-slate-200 bg-white py-4"
            role="dialog"
            aria-modal="true"
            aria-label="Mobile menu"
          >
            <nav className="flex flex-col gap-0.5 px-2">
              {navItems.map((item) => {
                const isActive =
                  pathname === item.href ||
                  (item.href !== '/dashboard' && pathname.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      'px-4 py-3 text-[14px] font-medium rounded-lg transition-colors',
                      isActive
                        ? 'text-slate-900 bg-slate-100'
                        : 'text-slate-700 hover:bg-slate-50'
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="mt-3 px-4">
              <div className="flex items-center gap-2 px-3 py-2 rounded-lg border border-slate-200 bg-slate-50/80 text-slate-500">
                <Search className="h-4 w-4 shrink-0" />
                <input
                  type="search"
                  placeholder="Search jobs, applicants…"
                  className="flex-1 min-w-0 bg-transparent text-[14px] outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
