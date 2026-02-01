'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { Plus, Briefcase, MapPin, Calendar, ChevronRight } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  status: string;
  createdAt: string;
};

export default function HRJobsPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs');
      const data = await response.json();
      if (data.success) {
        setJobs(data.jobs);
      }
    } catch (error) {
      console.error('Failed to fetch jobs:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEmploymentTypeLabel = (type: string) => {
    return type.replace('_', ' ').replace(/\b\w/g, (l) => l.toUpperCase());
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-[14px] text-slate-500">Loading…</p>
      </div>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Breadcrumbs
          items={[
            { label: 'Dashboard', href: '/dashboard' },
            { label: 'Jobs' },
          ]}
        />
      </div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-[22px] font-semibold text-slate-900">Job postings</h1>
          <p className="text-[13px] text-slate-500 mt-0.5">Manage your open positions</p>
        </div>
        <Link
          href="/jobs/create"
          className="inline-flex items-center gap-2 px-3 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Job
        </Link>
      </div>

      {jobs.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-16 text-center">
          <Briefcase className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-[15px] font-medium text-slate-900 mb-2">No jobs yet</h3>
          <p className="text-[13px] text-slate-500 mb-6">Create your first job posting to get started</p>
          <Link
            href="/jobs/create"
            className="inline-flex items-center gap-2 px-4 py-2 text-[13px] font-medium rounded-lg bg-slate-900 text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            Create First Job
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {jobs.map((job) => (
            <Link
              key={job.id}
              href={`/jobs/${job.id}`}
              className="block rounded-xl border border-slate-200 bg-white p-6 hover:bg-slate-50/50 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <h3 className="text-[14px] font-medium text-slate-900">{job.title}</h3>
                    <span
                      className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${
                        job.status === 'active'
                          ? 'bg-emerald-50 text-emerald-700'
                          : job.status === 'paused'
                            ? 'bg-amber-50 text-amber-700'
                            : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {job.status === 'active' ? 'Open' : job.status === 'paused' ? 'Paused' : 'Closed'}
                    </span>
                    <span className="text-[12px] text-slate-500">
                      {getEmploymentTypeLabel(job.employmentType)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-4 text-[13px] text-slate-500">
                    <span className="flex items-center gap-1">
                      <Briefcase className="h-3.5 w-3.5" />
                      {job.department}
                    </span>
                    <span className="flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {job.location}
                    </span>
                  </div>
                  <p className="text-[12px] text-slate-400 mt-1">
                    Posted {formatDistanceToNow(new Date(job.createdAt), { addSuffix: true })}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </div>
            </Link>
          ))}
        </div>
      )}
    </main>
  );
}
