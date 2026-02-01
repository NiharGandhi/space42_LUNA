'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { CareerChat } from '@/app/components/CareerChat';
import Link from 'next/link';
import { Briefcase, ArrowRight, Search, MapPin, DollarSign } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  description: string;
};

export default function CareerPage() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const response = await fetch('/api/jobs?status=active');
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

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}k`;
    return null;
  };

  const filteredJobs = jobs.filter((job) => {
    const query = searchQuery.toLowerCase();
    return (
      job.title.toLowerCase().includes(query) ||
      job.department.toLowerCase().includes(query) ||
      job.location.toLowerCase().includes(query) ||
      job.description.toLowerCase().includes(query)
    );
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-zinc-200 border-t-[#0066FF]" />
          <p className="text-zinc-600 font-medium">Loading opportunities...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <div className="border-b border-zinc-200 bg-white px-4 py-4 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <Link
            href="/"
            className="flex items-center gap-2"
          >
            <img src="/logo.svg" alt="Space42" className="h-6 w-auto" />
            <span className="text-base font-semibold text-zinc-900">Space42</span>
          </Link>
          <div className="flex items-center gap-4">
            <Link
              href="/my-dashboard"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              Dashboard
            </Link>
            <Link
              href="/my-applications"
              className="text-sm font-medium text-zinc-600 transition-colors hover:text-zinc-900"
            >
              My Applications
            </Link>
          </div>
        </div>
      </div>

      {/* Hero Section */}
      <div className="border-b border-zinc-200 px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <h1 className="text-5xl font-bold tracking-tight text-zinc-900 sm:text-6xl">
            Careers
          </h1>
          <p className="mt-4 text-lg text-zinc-600">
            Join our team and help build the future of AI-powered hiring
          </p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="border-b border-zinc-200 bg-zinc-50/50 px-4 py-6 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-400" />
            <input
              type="text"
              placeholder="Search by title, department, or location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-zinc-300 bg-white py-3 pl-12 pr-4 text-sm text-zinc-900 placeholder-zinc-500 transition-colors focus:border-[#0066FF] focus:outline-none focus:ring-1 focus:ring-[#0066FF]"
            />
          </div>
          {searchQuery && (
            <p className="mt-3 text-sm text-zinc-600">
              {filteredJobs.length} position{filteredJobs.length !== 1 ? 's' : ''} found
            </p>
          )}
        </div>
      </div>

      {/* Jobs Grid + Chat */}
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-8 lg:flex-row lg:gap-12">
          {/* Jobs Grid */}
          <div className="flex-1">
            {filteredJobs.length === 0 ? (
              <div className="py-12 text-center">
                <Briefcase className="mx-auto h-12 w-12 text-zinc-300" />
                <h3 className="mt-4 text-base font-semibold text-zinc-900">
                  {searchQuery ? 'No positions found' : 'No openings at the moment'}
                </h3>
                <p className="mt-2 text-sm text-zinc-600">
                  {searchQuery ? 'Try adjusting your search terms.' : 'Check back soon for new opportunities.'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                {filteredJobs.map((job) => (
                  <div
                    key={job.id}
                    onClick={() => router.push(`/career/${job.id}`)}
                    className="group cursor-pointer rounded-xl border border-zinc-200 bg-white p-6 transition-all hover:border-zinc-300 hover:shadow-lg"
                  >
                    <div className="mb-4 flex items-start justify-between">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#0066FF]/10">
                        <Briefcase className="h-5 w-5 text-[#0066FF]" />
                      </div>
                      <ArrowRight className="h-5 w-5 text-zinc-400 transition-all group-hover:translate-x-1 group-hover:text-[#0066FF]" />
                    </div>

                    <h3 className="mb-3 text-xl font-semibold text-zinc-900 group-hover:text-[#0066FF]">
                      {job.title}
                    </h3>

                    <p className="mb-4 line-clamp-2 text-sm leading-relaxed text-zinc-600">
                      {job.description}
                    </p>

                    <div className="flex flex-wrap gap-2 border-t border-zinc-100 pt-4">
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700">
                        <Briefcase className="h-3.5 w-3.5 text-zinc-400" />
                        {job.department}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-zinc-700">
                        <MapPin className="h-3.5 w-3.5 text-zinc-400" />
                        {job.location}
                      </span>
                      <span className="text-zinc-300">•</span>
                      <span className="text-xs font-medium text-zinc-700">
                        {getEmploymentTypeLabel(job.employmentType)}
                      </span>
                      {formatSalary(job.salaryRangeMin, job.salaryRangeMax) && (
                        <>
                          <span className="text-zinc-300">•</span>
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-[#0066FF]">
                            <DollarSign className="h-3.5 w-3.5" />
                            {formatSalary(job.salaryRangeMin, job.salaryRangeMax)}
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Chat Widget */}
          <aside className="lg:w-[380px] lg:shrink-0">
            <div className="lg:sticky lg:top-6">
              <CareerChat />
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
