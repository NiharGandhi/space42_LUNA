'use client';

import { useState } from 'react';
import Link from 'next/link';
import { LoginModal } from '@/app/components/LoginModal';

export function LandingNav() {
  const [loginOpen, setLoginOpen] = useState(false);

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-[1000] py-3 bg-white/80 backdrop-blur-xl border-b border-slate-200/60">
        <div className="max-w-6xl mx-auto px-6 lg:px-8 flex justify-between items-center">
          <Link href="/" className="flex items-center gap-3 no-underline">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo.svg" alt="Space42" className="h-8 w-auto block" />
          </Link>
          <div className="flex items-center gap-6">
            <Link
              href="/#careers"
              className="no-underline text-slate-600 text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Careers
            </Link>
            <Link
              href="/#about"
              className="no-underline text-slate-600 text-sm font-medium hover:text-blue-600 transition-colors"
            >
              About
            </Link>
            <Link
              href="/#contact"
              className="no-underline text-slate-600 text-sm font-medium hover:text-blue-600 transition-colors"
            >
              Contact
            </Link>
            <button
              type="button"
              onClick={() => setLoginOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium rounded-lg border border-slate-200 text-slate-700 bg-white hover:border-blue-300 hover:text-blue-600 hover:bg-blue-50/50 transition-all"
            >
              Login
            </button>
          </div>
        </div>
      </nav>
      <LoginModal isOpen={loginOpen} onClose={() => setLoginOpen(false)} />
    </>
  );
}
