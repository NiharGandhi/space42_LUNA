'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, X } from 'lucide-react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type JobForm = {
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  salaryRangeMin: string;
  salaryRangeMax: string;
  status: string;
};

export default function EditJobPage({
  params,
}: {
  params: Promise<{ jobId: string }>;
}) {
  const router = useRouter();
  const [jobId, setJobId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [jobNotFound, setJobNotFound] = useState(false);

  const [formData, setFormData] = useState<JobForm>({
    title: '',
    department: '',
    location: '',
    employmentType: 'full_time',
    description: '',
    salaryRangeMin: '',
    salaryRangeMax: '',
    status: 'active',
  });

  const [requirements, setRequirements] = useState<string[]>(['']);
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);

  useEffect(() => {
    params.then(async (p) => {
      setJobId(p.jobId);
      try {
        const res = await fetch(`/api/jobs/${p.jobId}`);
        const data = await res.json();
        if (!data.success || !data.job) {
          setJobNotFound(true);
        } else {
          const j = data.job;
          setFormData({
            title: j.title ?? '',
            department: j.department ?? '',
            location: j.location ?? '',
            employmentType: j.employmentType ?? 'full_time',
            description: j.description ?? '',
            salaryRangeMin: j.salaryRangeMin != null ? String(j.salaryRangeMin) : '',
            salaryRangeMax: j.salaryRangeMax != null ? String(j.salaryRangeMax) : '',
            status: j.status ?? 'active',
          });
          setRequirements(
            Array.isArray(j.requirements) && j.requirements.length > 0
              ? j.requirements
              : ['']
          );
          setResponsibilities(
            Array.isArray(j.responsibilities) && j.responsibilities.length > 0
              ? j.responsibilities
              : ['']
          );
        }
      } catch (e) {
        setError('Failed to load job');
      } finally {
        setLoading(false);
      }
    });
  }, [params]);

  const addRequirement = () => setRequirements([...requirements, '']);
  const removeRequirement = (i: number) =>
    setRequirements(requirements.filter((_, idx) => idx !== i));
  const updateRequirement = (i: number, v: string) => {
    const u = [...requirements];
    u[i] = v;
    setRequirements(u);
  };

  const addResponsibility = () => setResponsibilities([...responsibilities, '']);
  const removeResponsibility = (i: number) =>
    setResponsibilities(responsibilities.filter((_, idx) => idx !== i));
  const updateResponsibility = (i: number, v: string) => {
    const u = [...responsibilities];
    u[i] = v;
    setResponsibilities(u);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      const payload = {
        title: formData.title,
        department: formData.department,
        location: formData.location,
        employmentType: formData.employmentType,
        description: formData.description,
        status: formData.status,
        requirements: requirements.filter((r) => r.trim() !== ''),
        responsibilities: responsibilities.filter((r) => r.trim() !== ''),
        salaryRangeMin: formData.salaryRangeMin
          ? parseInt(formData.salaryRangeMin, 10)
          : undefined,
        salaryRangeMax: formData.salaryRangeMax
          ? parseInt(formData.salaryRangeMax, 10)
          : undefined,
      };

      const res = await fetch(`/api/jobs/${jobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();

      if (data.success) {
        router.push(`/jobs/${jobId}`);
      } else {
        setError(data.error || 'Failed to update job');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    );
  }

  if (jobNotFound) {
    return (
      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="rounded-xl border border-slate-200 bg-white p-12 text-center">
          <p className="text-[14px] text-slate-600 mb-4">Job not found</p>
          <Link href="/jobs" className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50">
            <ArrowLeft className="h-4 w-4" />
            Back to Jobs
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="max-w-4xl">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Jobs', href: '/jobs' },
              { label: formData.title || 'Edit', href: `/jobs/${jobId}` },
              { label: 'Edit' },
            ]}
          />
        </div>
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-slate-900">Edit job posting</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">
            Update job details, requirements, and responsibilities
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-semibold text-slate-900">Basic info</h2>
            </div>
            <div className="p-4 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Job title *
                  </label>
                  <input
                    type="text"
                    value={formData.title}
                    onChange={(e) =>
                      setFormData({ ...formData, title: e.target.value })
                    }
                    placeholder="e.g. Senior Software Engineer"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Department *
                  </label>
                  <input
                    type="text"
                    value={formData.department}
                    onChange={(e) =>
                      setFormData({ ...formData, department: e.target.value })
                    }
                    placeholder="e.g. Engineering"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Location *
                  </label>
                  <input
                    type="text"
                    value={formData.location}
                    onChange={(e) =>
                      setFormData({ ...formData, location: e.target.value })
                    }
                    placeholder="e.g. Remote / San Francisco, CA"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                    Employment type *
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData({ ...formData, employmentType: e.target.value })
                    }
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                  >
                    <option value="full_time">Full time</option>
                    <option value="part_time">Part time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Salary range (USD)
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={formData.salaryRangeMin}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryRangeMin: e.target.value })
                    }
                    placeholder="Min"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                  <input
                    type="number"
                    value={formData.salaryRangeMax}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryRangeMax: e.target.value })
                    }
                    placeholder="Max"
                    className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[13px] font-medium text-slate-700 mb-1.5">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value })
                  }
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                  <option value="closed">Closed</option>
                </select>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-semibold text-slate-900">Description</h2>
            </div>
            <div className="p-4">
              <textarea
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Describe the role, team, and what makes this opportunity great..."
                rows={6}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5 resize-none"
                required
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-semibold text-slate-900">Requirements</h2>
            </div>
            <div className="p-4 space-y-2">
              {requirements.map((req, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={req}
                    onChange={(e) => updateRequirement(i, e.target.value)}
                    placeholder="e.g. 5+ years of React experience"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                  {requirements.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeRequirement(i)}
                      className="p-2 text-slate-500 hover:text-red-600 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addRequirement}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add requirement
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100">
              <h2 className="text-[14px] font-semibold text-slate-900">Responsibilities</h2>
            </div>
            <div className="p-4 space-y-2">
              {responsibilities.map((resp, i) => (
                <div key={i} className="flex gap-2">
                  <input
                    type="text"
                    value={resp}
                    onChange={(e) => updateResponsibility(i, e.target.value)}
                    placeholder="e.g. Lead frontend architecture decisions"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-[14px] outline-none focus:ring-2 focus:ring-slate-900/5"
                  />
                  {responsibilities.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeResponsibility(i)}
                      className="p-2 text-slate-500 hover:text-red-600 rounded-lg"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
              <button
                type="button"
                onClick={addResponsibility}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
              >
                <Plus className="h-4 w-4" />
                Add responsibility
              </button>
            </div>
          </div>

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
              <p className="text-[13px] text-red-600">{error}</p>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save changes'}
            </button>
            <Link
              href={`/jobs/${jobId}`}
              className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50"
            >
              <ArrowLeft className="h-4 w-4" />
              Cancel
            </Link>
          </div>
        </form>
      </div>
    </main>
  );
}
