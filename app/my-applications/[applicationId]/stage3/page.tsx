'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, PhoneOff, Mic } from 'lucide-react';

export default function Stage3Page({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [publicKey, setPublicKey] = useState<string | null>(null);
  const [assistantId, setAssistantId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [callActive, setCallActive] = useState(false);
  const [ending, setEnding] = useState(false);
  const vapiRef = useRef<{
    start: (id: string) => Promise<unknown>;
    end: () => void;
    send: (msg: { type: 'end-call' }) => void;
    stop: () => Promise<void>;
  } | null>(null);

  useEffect(() => {
    params.then((p) => {
      setApplicationId(p.applicationId);
      fetchConfig(p.applicationId);
    });
  }, [params]);

  const fetchConfig = async (id: string) => {
    try {
      const [sessionRes, configRes] = await Promise.all([
        fetch('/api/auth/session'),
        fetch(`/api/applications/${id}/stage3/config`),
      ]);
      const sessionData = await sessionRes.json();
      const configData = await configRes.json();

      if (!sessionData.success || !sessionData.user) {
        router.replace('/login?redirect=/my-applications/' + id + '/stage3');
        setLoading(false);
        return;
      }
      if (sessionData.user.role !== 'candidate') {
        router.replace('/dashboard');
        setLoading(false);
        return;
      }
      if (!configData.success) {
        setMessage(configData.error ?? 'Failed to load interview config');
        setLoading(false);
        return;
      }
      setPublicKey(configData.publicKey);
      setAssistantId(configData.assistantId);
      setJobTitle(configData.jobTitle ?? '');
    } catch (e) {
      console.error(e);
      setMessage('Failed to load interview');
    } finally {
      setLoading(false);
    }
  };

  const startCall = async () => {
    if (!publicKey || !assistantId || callActive) return;
    setMessage(null);
    try {
      const { default: Vapi } = await import('@vapi-ai/web');
      const vapi = new Vapi(publicKey);
      vapiRef.current = vapi;
      vapi.on('call-start', () => setCallActive(true));
      vapi.on('call-end', () => {
        setCallActive(false);
        vapiRef.current = null;
      });
      await vapi.start(assistantId);
    } catch (e) {
      console.error(e);
      setMessage('Failed to start voice interview. Please allow microphone access.');
    }
  };

  const endCall = async () => {
    const vapi = vapiRef.current;
    if (!vapi || ending) return;
    setEnding(true);
    try {
      // Send end-call to server, then await full teardown so the mic is released
      vapi.send({ type: 'end-call' });
      await vapi.stop();
    } catch (e) {
      console.error('Error ending call:', e);
    } finally {
      vapiRef.current = null;
      setCallActive(false);
      setEnding(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 rounded-full border-2 border-slate-300 border-t-slate-600 animate-spin" />
          <p className="text-slate-600 text-sm">Loading interview...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-xl mx-auto">
        <Link
          href="/my-applications"
          className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 mb-8 transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Applications
        </Link>

        <div className="text-center mb-8">
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 mb-1">
            Stage 3
          </p>
          <h1 className="text-2xl font-bold text-slate-900 mb-1">
            Voice interview
          </h1>
          {jobTitle && (
            <p className="text-slate-600 font-medium">{jobTitle}</p>
          )}
        </div>

        <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
          {message && (
            <div className="px-6 py-3 bg-amber-50 border-b border-amber-200/60 text-amber-800 text-sm">
              {message}
            </div>
          )}

          {!publicKey || !assistantId ? (
            <div className="p-8 text-center">
              <p className="text-slate-600">
                Interview is not available. Make sure you have passed Stage 2.
              </p>
              <Link
                href="/my-applications"
                className="mt-4 inline-block text-sm font-medium text-slate-700 hover:text-slate-900"
              >
                Back to applications
              </Link>
            </div>
          ) : callActive ? (
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="flex items-center justify-center gap-2 rounded-full bg-emerald-100 text-emerald-700 px-4 py-2 mb-6">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-600" />
                  </span>
                  <span className="text-sm font-medium">Live</span>
                </div>
                <p className="text-slate-600 text-sm mb-6">
                  You’re in the interview. When the interviewer says the interview is complete, the call will end automatically—or you can end it below.
                </p>
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => void endCall()}
                  disabled={ending}
                  className="rounded-full px-8 font-medium shadow-sm text-slate-900 hover:bg-slate-100"
                >
                  <PhoneOff className="h-5 w-5 mr-2" />
                  {ending ? 'Ending…' : 'End interview'}
                </Button>
              </div>
            </div>
          ) : (
            <div className="p-8">
              <div className="flex flex-col items-center text-center">
                <div className="rounded-full bg-slate-100 p-4 mb-6">
                  <Mic className="h-10 w-10 text-slate-500" />
                </div>
                <p className="text-slate-600 text-sm mb-2 max-w-sm">
                  A short voice interview for this role. You’ll be asked a few questions—answer when you’re ready. Use a quiet place and allow microphone access.
                </p>
                <p className="text-slate-500 text-xs mb-6">
                  The call will end automatically when the interviewer says so, or you can end it anytime.
                </p>
                <Button
                  size="lg"
                  onClick={startCall}
                  className="rounded-full px-8 font-medium bg-slate-900 hover:bg-slate-800 text-white shadow-sm"
                >
                  <Phone className="h-5 w-5 mr-2" />
                  Start voice interview
                </Button>
              </div>
            </div>
          )}
        </Card>

        <p className="mt-6 text-center text-xs text-slate-500">
          Your responses are recorded and reviewed as part of your application.
        </p>
      </div>
    </div>
  );
}
