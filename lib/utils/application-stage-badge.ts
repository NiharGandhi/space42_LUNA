/**
 * Returns label and Tailwind classes for application status badges.
 * Use across HR dashboard, applications list, application detail, and candidate views.
 */
export function applicationStageBadge(status: string): { label: string; className: string } {
  if (status === 'hired') return { label: 'Hired', className: 'bg-emerald-50 text-emerald-700' };
  if (status === 'rejected') return { label: 'Rejected', className: 'bg-red-50 text-red-700' };
  if (status === 'withdrawn') return { label: 'Withdrawn', className: 'bg-slate-100 text-slate-600' };
  if (status === 'submitted') return { label: 'Screening', className: 'bg-amber-50 text-amber-700' };
  if (status === 'stage1_pending') return { label: 'Screening', className: 'bg-amber-50 text-amber-700' };
  if (status === 'stage1_passed') return { label: 'Stage 1 passed', className: 'bg-blue-50 text-blue-700' };
  if (status === 'stage1_failed') return { label: 'Stage 1 failed', className: 'bg-red-50 text-red-700' };
  if (status === 'stage2_pending') return { label: 'Questions', className: 'bg-amber-50 text-amber-700' };
  if (status === 'stage2_passed') return { label: 'Stage 2 passed', className: 'bg-blue-50 text-blue-700' };
  if (status === 'stage2_failed') return { label: 'Stage 2 failed', className: 'bg-red-50 text-red-700' };
  if (status === 'stage3_pending') return { label: 'Interview', className: 'bg-amber-50 text-amber-700' };
  if (status === 'stage3_passed') return { label: 'All passed', className: 'bg-emerald-50 text-emerald-700' };
  if (status === 'stage3_failed') return { label: 'Stage 3 failed', className: 'bg-red-50 text-red-700' };
  return { label: 'Review', className: 'bg-slate-100 text-slate-600' };
}
