'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';

type Step = 'email' | 'otp';

type LoginModalProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleEmailSubmit = async (e: React.FormEvent) => {
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
        setStep('otp');
      } else {
        setError(data.error || 'Failed to send code');
      }
    } catch {
      setError('Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySubmit = async (e: React.FormEvent) => {
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
        onClose();
        if (data.user.role === 'hr' || data.user.role === 'admin') {
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
      if (data.success) setError('');
      else setError(data.error || 'Failed to resend');
    } catch {
      setError('Failed to resend');
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    setStep('email');
    setCode('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[1100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-slate-200/80 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <h2 className="text-lg font-semibold text-slate-900">
            {step === 'email' ? 'Log in' : 'Check your email'}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 -m-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 pb-6">
          {step === 'email' ? (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label htmlFor="modal-email" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Email address
                </label>
                <input
                  id="modal-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-base rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Sending...' : 'Continue'}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifySubmit} className="space-y-4">
              <p className="text-sm text-slate-600">
                We sent a 6-digit code to <span className="font-medium text-slate-900">{email}</span>
              </p>
              <div>
                <label htmlFor="modal-code" className="block text-sm font-medium text-slate-700 mb-1.5">
                  Verification code
                </label>
                <input
                  id="modal-code"
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  maxLength={6}
                  required
                  disabled={loading}
                  className="w-full px-3 py-2.5 text-center text-lg tracking-[0.3em] rounded-lg border border-slate-200 bg-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400 transition-colors"
                />
              </div>
              {error && (
                <p className="text-sm text-red-600">{error}</p>
              )}
              <button
                type="submit"
                disabled={loading || code.length !== 6}
                className="w-full py-2.5 px-4 text-sm font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {loading ? 'Verifying...' : 'Log in'}
              </button>
              <div className="flex items-center justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBack}
                  disabled={loading}
                  className="text-slate-500 hover:text-slate-700"
                >
                  Use different email
                </button>
                <button
                  type="button"
                  onClick={handleResend}
                  disabled={loading}
                  className="text-slate-900 font-medium hover:underline"
                >
                  Resend code
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
