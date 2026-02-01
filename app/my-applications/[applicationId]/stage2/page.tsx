'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, FileText } from 'lucide-react';

type Question = {
  id: string;
  questionText: string;
  questionOrder: number;
  isRequired: boolean;
};

export default function Stage2Page({
  params,
}: {
  params: Promise<{ applicationId: string }>;
}) {
  const router = useRouter();
  const [applicationId, setApplicationId] = useState<string>('');
  const [jobTitle, setJobTitle] = useState('');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    params.then((p) => {
      setApplicationId(p.applicationId);
      fetchStage2(p.applicationId);
    });
  }, [params]);

  const fetchStage2 = async (id: string) => {
    try {
      const [sessionRes, stage2Res] = await Promise.all([
        fetch('/api/auth/session'),
        fetch(`/api/applications/${id}/stage2`),
      ]);
      const sessionData = await sessionRes.json();
      const stage2Data = await stage2Res.json();

      if (!sessionData.success || !sessionData.user) {
        router.replace('/login?redirect=/my-applications/' + id + '/stage2');
        return;
      }
      if (sessionData.user.role !== 'candidate') {
        router.replace('/dashboard');
        return;
      }
      if (!stage2Data.success) {
        setMessage(stage2Data.error ?? 'Failed to load questions');
        setQuestions([]);
        setLoading(false);
        return;
      }
      setJobTitle(stage2Data.jobTitle ?? '');
      setQuestions(stage2Data.questions ?? []);
      setAlreadySubmitted(!!stage2Data.alreadySubmitted);
      if (stage2Data.message) setMessage(stage2Data.message);
      const initial: Record<string, string> = {};
      (stage2Data.questions ?? []).forEach((q: Question) => {
        initial[q.id] = '';
      });
      setAnswers(initial);
    } catch (e) {
      console.error(e);
      setMessage('Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applicationId || submitting) return;
    const missing = questions.filter((q) => q.isRequired && !(answers[q.id]?.trim()));
    if (missing.length > 0) {
      alert('Please answer all required questions.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/applications/${applicationId}/stage2`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          answers: questions.map((q) => ({
            questionId: q.id,
            answerText: answers[q.id]?.trim() ?? '',
          })),
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/my-applications?stage2=submitted');
      } else {
        alert(data.error ?? 'Failed to submit');
      }
    } catch (e) {
      alert('Failed to submit answers');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <Link
          href="/my-applications"
          className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to My Applications
        </Link>

        <Card className="p-6 mb-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Stage 2: Screening questions</h1>
          <p className="text-gray-600">{jobTitle}</p>
        </Card>

        {alreadySubmitted ? (
          <Card className="p-8 text-center">
            <FileText className="h-12 w-12 text-green-600 mx-auto mb-4" />
            <h2 className="text-lg font-semibold text-gray-900 mb-2">Already submitted</h2>
            <p className="text-gray-600 mb-4">You have already completed Stage 2 for this application.</p>
            <Link href="/my-applications">
              <Button>Back to My Applications</Button>
            </Link>
          </Card>
        ) : message && questions.length === 0 ? (
          <Card className="p-8 text-center">
            <p className="text-gray-600 mb-4">{message}</p>
            <Link href="/my-applications">
              <Button variant="outline">Back to My Applications</Button>
            </Link>
          </Card>
        ) : (
          <form onSubmit={handleSubmit}>
            <Card className="p-6 space-y-6">
              {questions.map((q, i) => (
                <div key={q.id}>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {i + 1}. {q.questionText}
                    {q.isRequired && <span className="text-red-500 ml-1">*</span>}
                  </label>
                  <Textarea
                    value={answers[q.id] ?? ''}
                    onChange={(e) =>
                      setAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Your answer"
                    rows={4}
                    className="resize-none"
                    required={q.isRequired}
                  />
                </div>
              ))}
              <div className="flex gap-3 pt-2">
                <Button type="submit" disabled={submitting}>
                  {submitting ? 'Submitting…' : 'Submit answers'}
                </Button>
                <Link href="/my-applications">
                  <Button type="button" variant="outline">
                    Cancel
                  </Button>
                </Link>
              </div>
            </Card>
          </form>
        )}
      </div>
    </div>
  );
}
