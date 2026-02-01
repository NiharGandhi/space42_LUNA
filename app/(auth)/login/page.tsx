'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '';

  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    // Clear any stale session data
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('login_email');
      sessionStorage.removeItem('login_redirect');
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.setItem('login_email', email);
        if (redirect) sessionStorage.setItem('login_redirect', redirect);
        router.push(redirect ? `/verify?redirect=${encodeURIComponent(redirect)}` : '/verify');
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="inline-block mb-8">
            <img src="/logo.svg" alt="Space42" className="h-7 w-auto" />
          </Link>

          <h1 className="text-[22px] font-semibold text-slate-900 mb-1">Log in to your account</h1>
          <p className="text-[15px] text-slate-500 mb-8">
            Enter your email to receive a one-time login code.
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="email" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Email address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@company.com"
                required
                disabled={loading}
                autoComplete="email"
                className="w-full h-11 px-3 text-[15px] rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 flex items-center justify-center text-[14px] font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Sending code...' : 'Continue'}
            </button>
          </form>

          <p className="mt-8 text-[13px] text-slate-500 text-center">
            <Link href="/" className="text-slate-700 hover:text-slate-900 underline underline-offset-2">
              ← Back to home
            </Link>
          </p>
        </div>
      </div>

      <footer className="py-6 text-center">
        <p className="text-[12px] text-slate-400">
          © {new Date().getFullYear()} Space42
        </p>
      </footer>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
