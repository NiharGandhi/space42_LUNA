'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { Plus, ChevronRight, ChevronLeft } from 'lucide-react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';
import { applicationStageBadge } from '@/lib/utils/application-stage-badge';

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  status: string;
};

type Application = {
  id: string;
  job: { title: string };
  candidate?: { name: string | null; email: string };
  status: string;
  createdAt?: string;
};

type CalendarEvent = {
  id: string;
  applicationId: string;
  label: string;
  status: string;
  scheduledAt: string;
  completedAt: string | null;
  jobTitle: string;
  candidateName: string | null;
  candidateEmail: string;
};

function statusLabel(s: string) {
  if (s === 'active') return 'Open';
  if (s === 'paused') return 'Paused';
  if (s === 'closed') return 'Closed';
  if (s === 'draft') return 'Draft';
  return s;
}

export default function HRDashboardPage() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [applications, setApplications] = useState<Application[]>([]);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [calDate, setCalDate] = useState(() => new Date());
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [jobsRes, appsRes] = await Promise.all([
          fetch('/api/jobs'),
          fetch('/api/applications'),
        ]);
        const jobsData = await jobsRes.json();
        const appsData = await appsRes.json();
        if (jobsData.success) setJobs(jobsData.jobs ?? []);
        if (appsData.success) setApplications(appsData.applications ?? []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    const start = new Date(calDate.getFullYear(), calDate.getMonth() - 1, 1);
    const end = new Date(calDate.getFullYear(), calDate.getMonth() + 2, 0, 23, 59, 59);
    fetch(
      `/api/hr/upcoming-events?start=${start.toISOString()}&end=${end.toISOString()}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.events)) setEvents(data.events);
      })
      .catch(console.error);
  }, [calDate]);

  const activeJobs = jobs.filter((j) => j.status === 'active').length;
  const hiredCount = applications.filter((a) => a.status === 'hired').length;
  const offersExtended = applications.filter((a) => a.status === 'stage3_passed').length;
  const inInterview = applications.filter(
    (a) => a.status === 'stage2_passed' || a.status === 'stage3_pending'
  ).length;

  // Applicants trend: last 7 days, applied vs reviewed (reviewed = past initial screening)
  const trendData = useMemo(() => {
    const days = 7;
    const result: { label: string; applied: number; reviewed: number }[] = [];
    for (let i = days - 1; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const start = new Date(d);
      start.setHours(0, 0, 0, 0);
      const end = new Date(d);
      end.setHours(23, 59, 59, 999);
      const applied = applications.filter((a) => {
        const created = (a as any).createdAt ? new Date((a as any).createdAt) : null;
        if (!created || isNaN(created.getTime())) return false;
        return created >= start && created <= end;
      }).length;
      const reviewed = applications.filter((a) => {
        const created = (a as any).createdAt ? new Date((a as any).createdAt) : null;
        if (!created || isNaN(created.getTime())) return false;
        return created >= start && created <= end && a.status !== 'submitted';
      }).length;
      result.push({
        label: start.toLocaleDateString('en-US', { weekday: 'short' }),
        applied,
        reviewed,
      });
    }
    return result;
  }, [applications]);

  const maxTrend = Math.max(1, ...trendData.flatMap((d) => [d.applied, d.reviewed]));

  const monthName = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const firstDay = new Date(calDate.getFullYear(), calDate.getMonth(), 1);
  const lastDay = new Date(calDate.getFullYear(), calDate.getMonth() + 1, 0);
  const startPad = ((firstDay.getDay() + 6) % 7);
  const daysInMonth = lastDay.getDate();
  const calDays = [
    ...Array(startPad).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const dateKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const e of events) {
      const d = new Date(e.scheduledAt);
      const key = dateKey(d);
      if (!map[key]) map[key] = [];
      map[key].push(e);
    }
    return map;
  }, [events]);

  const selectedEvents = selectedDate ? (eventsByDate[dateKey(selectedDate)] ?? []) : [];

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="mb-4">
        <Breadcrumbs items={[{ label: 'Dashboard' }]} />
      </div>
        {/* KPIs */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">Open roles</span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">
              {loading ? '—' : activeJobs}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">Applicants (7d)</span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">
              {loading ? '—' : trendData.reduce((sum, d) => sum + d.applied, 0)}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">Total jobs</span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">
              {loading ? '—' : jobs.length}
            </span>
          </div>
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <span className="block text-[12px] font-medium text-slate-500 uppercase tracking-wide">Offers</span>
            <span className="block text-[22px] font-semibold text-slate-900 mt-1">
              {loading ? '—' : offersExtended}
            </span>
          </div>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Jobs + Applicants */}
          <div className="lg:col-span-2 space-y-6">
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h2 className="text-[14px] font-semibold text-slate-900">Job listings</h2>
                <Link
                  href="/jobs/create"
                  className="text-[13px] font-medium text-slate-900 hover:text-slate-700"
                >
                  Post job
                </Link>
              </div>
              <div className="divide-y divide-slate-100 max-h-[320px] overflow-y-auto">
                {loading ? (
                  <div className="px-4 py-8 text-center text-[13px] text-slate-500">Loading…</div>
                ) : jobs.length === 0 ? (
                  <div className="px-4 py-8 text-center text-[13px] text-slate-500">No jobs yet</div>
                ) : (
                  jobs.slice(0, 8).map((job) => (
                    <Link
                      key={job.id}
                      href={`/jobs/${job.id}`}
                      className="flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="min-w-0">
                        <p className="text-[13px] font-medium text-slate-900 truncate">{job.title}</p>
                        <p className="text-[12px] text-slate-500 mt-0.5">
                          {job.department} · {job.location}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span
                          className={`inline-flex items-center px-2 py-1 rounded-full text-[11px] font-medium ${
                            job.status === 'active'
                              ? 'bg-emerald-50 text-emerald-700'
                              : job.status === 'paused'
                              ? 'bg-amber-50 text-amber-700'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {statusLabel(job.status)}
                        </span>
                        <ChevronRight className="h-4 w-4 text-slate-400" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </section>

            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h2 className="text-[14px] font-semibold text-slate-900">Recent applicants</h2>
                <Link
                  href="/applications"
                  className="text-[13px] font-medium text-slate-900 hover:text-slate-700"
                >
                  View all
                </Link>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-slate-100">
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Applicant</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Role</th>
                      <th className="text-left py-3 px-4 font-medium text-slate-500">Stage</th>
                      <th className="text-right py-3 px-4 font-medium text-slate-500"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          Loading…
                        </td>
                      </tr>
                    ) : applications.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="py-8 text-center text-slate-500">
                          No applications yet
                        </td>
                      </tr>
                    ) : (
                      applications.slice(0, 6).map((app) => (
                        <tr key={app.id} className="border-b border-slate-50 hover:bg-slate-50/30">
                          <td className="py-3 px-4">
                            <p className="font-medium text-slate-900">
                              {(app as any).candidate?.name || (app as any).candidate?.email || '—'}
                            </p>
                            {(app as any).candidate?.email && (
                              <p className="text-[12px] text-slate-500">{(app as any).candidate.email}</p>
                            )}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{app.job?.title ?? '—'}</td>
                          <td className="py-3 px-4">
                            {(() => {
                              const b = applicationStageBadge(app.status);
                              return (
                                <span className={`inline-flex px-2 py-1 rounded-full text-[11px] font-medium ${b.className}`}>
                                  {b.label}
                                </span>
                              );
                            })()}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Link
                              href={`/applications/${app.id}`}
                              className="text-[13px] font-medium text-slate-900 hover:underline"
                            >
                              View
                            </Link>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>

          {/* Right col - Widgets */}
          <div className="space-y-6">
            {/* Applicants Trend Graph */}
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h2 className="text-[14px] font-semibold text-slate-900">Applicants trend</h2>
                <span className="text-[12px] text-slate-500">Applied vs Reviewed</span>
              </div>
              <div className="p-4">
                <div className="h-[160px] flex items-end gap-2">
                  {trendData.map((d, i) => (
                    <div key={i} className="flex-1 flex flex-col items-center gap-2">
                      <div className="w-full flex gap-0.5 justify-center items-end h-[140px]">
                        <div
                          className="flex-1 max-w-[12px] bg-blue-500 rounded-t min-h-[4px] transition-all"
                          style={{
                            height: `${Math.max(4, (d.applied / maxTrend) * 120)}px`,
                          }}
                          title={`${d.label}: ${d.applied} applied`}
                        />
                        <div
                          className="flex-1 max-w-[12px] bg-sky-400/90 rounded-t min-h-[4px] transition-all"
                          style={{
                            height: `${Math.max(4, (d.reviewed / maxTrend) * 120)}px`,
                          }}
                          title={`${d.label}: ${d.reviewed} reviewed`}
                        />
                      </div>
                      <span className="text-[10px] text-slate-400">{d.label}</span>
                    </div>
                  ))}
                </div>
                <div className="flex gap-4 mt-2 text-[12px] font-medium text-slate-500">
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    Applied
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-sky-400" />
                    Reviewed
                  </span>
                </div>
              </div>
            </section>

            {/* Meetings / Calendar */}
            <section className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
                <h2 className="text-[14px] font-semibold text-slate-900">Meetings</h2>
                <span className="text-[12px] text-slate-500">{monthName}</span>
              </div>
              <div className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <button
                    type="button"
                    onClick={() =>
                      setCalDate((d) => new Date(d.getFullYear(), d.getMonth() - 1))
                    }
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                    aria-label="Previous month"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-[13px] font-medium text-slate-900">{monthName}</span>
                  <button
                    type="button"
                    onClick={() =>
                      setCalDate((d) => new Date(d.getFullYear(), d.getMonth() + 1))
                    }
                    className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 transition-colors"
                    aria-label="Next month"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 text-[11px] font-medium text-slate-500 mb-2">
                  {['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'].map((d) => (
                    <div key={d} className="text-center py-1">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {calDays.map((day, i) => {
                    const dayDate = day
                      ? new Date(calDate.getFullYear(), calDate.getMonth(), day)
                      : null;
                    const key = dayDate ? dateKey(dayDate) : '';
                    const dayEvents = dayDate ? (eventsByDate[key] ?? []) : [];
                    const isToday =
                      dayDate &&
                      calDate.getMonth() === new Date().getMonth() &&
                      calDate.getFullYear() === new Date().getFullYear() &&
                      day === new Date().getDate();
                    const isSelected =
                      selectedDate &&
                      dayDate &&
                      selectedDate.getDate() === day &&
                      selectedDate.getMonth() === calDate.getMonth() &&
                      selectedDate.getFullYear() === calDate.getFullYear();
                    return (
                      <button
                        key={i}
                        type="button"
                        onClick={() => day && setSelectedDate(new Date(calDate.getFullYear(), calDate.getMonth(), day))}
                        className={`aspect-square flex flex-col items-center justify-center rounded-lg text-[12px] font-medium transition-colors ${
                          day
                            ? 'bg-slate-50 text-slate-800 hover:bg-slate-100 cursor-pointer'
                            : 'invisible pointer-events-none'
                        } ${isToday ? 'ring-1 ring-blue-400' : ''} ${
                          isSelected ? 'ring-2 ring-blue-500 ring-offset-1 bg-blue-50' : ''
                        }`}
                      >
                        <span>{day ?? ''}</span>
                        {dayEvents.length > 0 && (
                          <span className="flex gap-0.5 mt-0.5">
                            {dayEvents.slice(0, 2).map((_, idx) => (
                              <span
                                key={idx}
                                className="w-1 h-1 rounded-full bg-blue-500"
                              />
                            ))}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {selectedDate && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <p className="text-[12px] font-medium text-slate-700 mb-2">
                      {selectedDate.toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                    {selectedEvents.length === 0 ? (
                      <p className="text-[12px] text-slate-500">No meetings scheduled</p>
                    ) : (
                      <ul className="space-y-2">
                        {selectedEvents.map((ev) => (
                          <li key={ev.id}>
                            <Link
                              href={`/applications/${ev.applicationId}`}
                              className="block rounded-lg border border-slate-100 p-2 hover:border-slate-200 hover:bg-slate-50/50 transition-colors"
                            >
                              <p className="text-[13px] font-medium text-slate-900">{ev.label}</p>
                              <p className="text-[11px] text-slate-500">
                                {ev.jobTitle}
                                {ev.candidateName || ev.candidateEmail
                                  ? ` · ${ev.candidateName || ev.candidateEmail}`
                                  : ''}
                              </p>
                              <p className="text-[11px] text-slate-500 mt-0.5">
                                {new Date(ev.scheduledAt).toLocaleTimeString('en-US', {
                                  hour: 'numeric',
                                  minute: '2-digit',
                                })}
                                {ev.status === 'completed' && (
                                  <span className="ml-2 text-emerald-600">Completed</span>
                                )}
                              </p>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            </section>
          </div>
        </div>
    </main>
  );
}
