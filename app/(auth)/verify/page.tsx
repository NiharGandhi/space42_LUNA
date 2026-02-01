'use client';

import { Suspense, useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

function VerifyPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectParam = searchParams.get('redirect') ?? '';

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const storedEmail = sessionStorage.getItem('login_email');
    if (!storedEmail) {
      router.push('/login' + (redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : ''));
      return;
    }
    setEmail(storedEmail);
    setReady(true);
  }, [router, redirectParam]);

  const getRedirectUrl = (): string => {
    const stored = typeof window !== 'undefined' ? sessionStorage.getItem('login_redirect') : null;
    const target = redirectParam || stored || '';
    if (target && target.startsWith('/')) return target;
    return '';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });

      const data = await res.json();

      if (data.success) {
        sessionStorage.removeItem('login_email');
        sessionStorage.removeItem('login_redirect');

        const redirectUrl = getRedirectUrl();
        if (redirectUrl) {
          router.push(redirectUrl);
        } else if (data.user.role === 'hr' || data.user.role === 'admin') {
          router.push('/dashboard');
        } else {
          router.push('/my-dashboard');
        }
      } else {
        setError(data.error || 'Invalid code');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
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
        setError('');
      } else {
        setError(data.error || 'Failed to resend');
      }
    } catch {
      setError('Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  if (!ready) {
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#fafafa]">
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-[400px]">
          <Link href="/" className="inline-block mb-8">
            <img src="/logo.svg" alt="Space42" className="h-7 w-auto" />
          </Link>

          <h1 className="text-[22px] font-semibold text-slate-900 mb-1">Check your email</h1>
          <p className="text-[15px] text-slate-500 mb-8">
            We sent a 6-digit code to <span className="font-medium text-slate-700">{email}</span>
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label htmlFor="code" className="block text-[13px] font-medium text-slate-700 mb-1.5">
                Verification code
              </label>
              <input
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="000000"
                maxLength={6}
                required
                disabled={loading}
                className="w-full h-11 px-3 text-center text-[18px] tracking-[0.25em] rounded-md border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/5 focus:border-slate-400 transition-colors"
              />
            </div>

            {error && (
              <div className="rounded-md bg-red-50 px-3 py-2">
                <p className="text-[13px] text-red-600">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || code.length !== 6}
              className="w-full h-11 flex items-center justify-center text-[14px] font-medium rounded-md bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Verifying...' : 'Log in'}
            </button>

            <div className="flex items-center justify-between text-[13px]">
              <Link
                href={'/login' + (redirectParam ? `?redirect=${encodeURIComponent(redirectParam)}` : '')}
                className="text-slate-500 hover:text-slate-700"
              >
                Use different email
              </Link>
              <button
                type="button"
                onClick={handleResend}
                disabled={loading}
                className="text-slate-900 font-medium hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
            </div>
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

export default function VerifyPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-[#fafafa]">
        <p className="text-slate-500">Loading...</p>
      </div>
    }>
      <VerifyPageContent />
    </Suspense>
  );
}
