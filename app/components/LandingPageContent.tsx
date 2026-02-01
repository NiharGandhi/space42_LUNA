'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Briefcase,
  MapPin,
  Clock,
  ArrowRight,
  Bot,
  Loader2,
  Sparkles,
  Maximize2,
  Minimize2,
  Users,
  Zap,
  Shield,
} from 'lucide-react';
import { CareerChat } from '@/app/components/CareerChat';
import { cn } from '@/lib/utils/cn';

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  description: string;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
};

export function LandingPageContent() {
  const router = useRouter();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [deptFilter, setDeptFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');
  const [chatExpanded, setChatExpanded] = useState(false);

  // Ensure page loads at top - prevent scroll jump to #careers
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const hash = window.location.hash;
      if (!hash) {
        window.history.scrollRestoration = 'manual';
        window.scrollTo(0, 0);
      }
    }
  }, []);

  useEffect(() => {
    fetch('/api/jobs?status=active')
      .then((res) => res.json())
      .then((data) => {
        if (data.success) setJobs(data.jobs ?? []);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const filteredJobs = jobs.filter((job) => {
    if (deptFilter !== 'all' && job.department?.toLowerCase() !== deptFilter) return false;
    if (locationFilter !== 'all' && job.location?.toLowerCase() !== locationFilter) return false;
    return true;
  });

  const departments = [...new Set(jobs.map((j) => j.department).filter(Boolean))];
  const locations = [...new Set(jobs.map((j) => j.location).filter(Boolean))];

  const scrollToCareers = () => {
    document.getElementById('careers')?.scrollIntoView({ behavior: 'smooth' });
  };

  const formatEmploymentType = (t: string) =>
    t?.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()) ?? '';

  const formatSalary = (min: number | null, max: number | null) => {
    if (!min && !max) return null;
    if (min && max) return `$${(min / 1000).toFixed(0)}k - $${(max / 1000).toFixed(0)}k`;
    if (min) return `From $${(min / 1000).toFixed(0)}k`;
    if (max) return `Up to $${(max / 1000).toFixed(0)}k`;
    return null;
  };

  return (
    <main className="bg-white">
      {/* Hero - Rich Modern SaaS with embedded AI Chat */}
      <section
        className="min-h-screen flex items-center pt-24 pb-20 relative overflow-hidden"
        style={{ scrollMarginTop: '110px' }}
      >
        {/* Hero::before - curved gradient accent (from design) */}
        <div
          className="absolute top-0 right-0 w-[60%] h-full -z-20"
          style={{
            background: 'linear-gradient(135deg, rgba(0, 102, 255, 0.05) 0%, rgba(51, 153, 255, 0.02) 100%)',
            borderRadius: '0 0 0 100%',
          }}
        />
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%230066ff' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />

        {/* Revolving orbits - background */}
        <div className="absolute inset-0 -z-[5] flex items-center justify-center pointer-events-none">
          <div className="relative w-[min(95vw,1000px)] h-[min(95vw,1000px)] max-w-[1000px] max-h-[1000px] origin-center">
            <svg className="absolute inset-0 w-full h-full animate-orbit origin-center" viewBox="0 0 400 400">
              <ellipse cx="200" cy="200" rx="185" ry="185" fill="none" stroke="rgba(0,102,255,0.12)" strokeWidth="1.5" strokeDasharray="10 14" />
            </svg>
            <svg className="absolute inset-0 w-full h-full animate-orbit-reverse origin-center" viewBox="0 0 400 400">
              <ellipse cx="200" cy="200" rx="135" ry="135" fill="none" stroke="rgba(51,153,255,0.1)" strokeWidth="1" strokeDasharray="8 12" />
            </svg>
            <svg className="absolute inset-0 w-full h-full animate-orbit-slow origin-center" viewBox="0 0 400 400">
              <ellipse cx="200" cy="200" rx="225" ry="225" fill="none" stroke="rgba(96,165,250,0.08)" strokeWidth="1" strokeDasharray="6 10" />
            </svg>
          </div>
        </div>

        {/* Top whitespace fillers - floating shapes & accents */}
        <div className="absolute left-[5%] top-[8%] w-[120px] h-[120px] opacity-20 animate-float rounded-[40%_60%_70%_30%_/40%_50%_60%_50%]" style={{ background: 'linear-gradient(135deg, #3399FF, transparent)', animationDelay: '-2s' }} />
        <div className="absolute right-[15%] top-[5%] w-[80px] h-[80px] opacity-15 animate-float rounded-full" style={{ background: 'radial-gradient(circle, rgba(0,102,255,0.3), transparent)', animationDelay: '-5s' }} />
        <div className="absolute left-[35%] top-[12%] w-[60px] h-[60px] opacity-10 animate-float rounded-full border border-blue-300/30" style={{ animationDelay: '-1s' }} />
        {/* Small star accents */}
        <div className="absolute left-[20%] top-[15%] w-1.5 h-1.5 rounded-full bg-blue-400/40 animate-float" style={{ animationDuration: '4s', animationDelay: '-0.5s' }} />
        <div className="absolute right-[30%] top-[10%] w-1 h-1 rounded-full bg-indigo-400/50 animate-float" style={{ animationDuration: '5s', animationDelay: '-2s' }} />
        <div className="absolute right-[8%] top-[18%] w-1 h-1 rounded-full bg-blue-500/30 animate-float" style={{ animationDuration: '6s', animationDelay: '-3s' }} />

        {/* Floating shapes - main (hero-image area, right side) */}
        <div
          className="absolute right-[10%] top-[25%] w-[300px] h-[300px] opacity-30 animate-float"
          style={{
            background: 'linear-gradient(135deg, #3399FF, transparent)',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
          }}
        />
        <div
          className="absolute right-0 bottom-[20%] w-[200px] h-[200px] opacity-30 animate-float"
          style={{
            background: 'linear-gradient(135deg, transparent, #0066FF)',
            borderRadius: '30% 70% 70% 30% / 30% 30% 70% 70%',
            animationDelay: '-3s',
          }}
        />
        <div
          className="absolute left-[8%] top-[35%] w-[180px] h-[180px] opacity-25 animate-float"
          style={{
            background: 'linear-gradient(135deg, #60a5fa, transparent)',
            borderRadius: '70% 30% 30% 70% / 70% 30% 70% 30%',
            animationDelay: '-1.5s',
          }}
        />
        <div
          className="absolute right-[25%] bottom-[35%] w-[150px] h-[150px] opacity-20 animate-float"
          style={{
            background: 'linear-gradient(135deg, transparent, #3399FF)',
            borderRadius: '30% 70% 50% 50% / 50% 30% 70% 50%',
            animationDelay: '-4.5s',
          }}
        />

        {/* Bottom whitespace fillers */}
        <div className="absolute left-[10%] bottom-[8%] w-[100px] h-[100px] opacity-18 animate-float rounded-[60%_40%_30%_70%_/60%_30%_70%_40%]" style={{ background: 'linear-gradient(225deg, transparent, #0066FF)', animationDelay: '-4s' }} />
        <div className="absolute right-[12%] bottom-[5%] w-[140px] h-[140px] opacity-15 animate-float rounded-[30%_70%_70%_30%_/30%_30%_70%_70%]" style={{ background: 'linear-gradient(315deg, #60a5fa, transparent)', animationDelay: '-6s' }} />
        <div className="absolute left-[45%] bottom-[12%] w-[70px] h-[70px] opacity-12 animate-float rounded-full border border-blue-400/20" style={{ animationDelay: '-2.5s' }} />
        <div className="absolute right-[40%] bottom-[10%] w-1.5 h-1.5 rounded-full bg-blue-400/35 animate-float" style={{ animationDuration: '5s', animationDelay: '-1s' }} />
        <div className="absolute left-[25%] bottom-[6%] w-1 h-1 rounded-full bg-indigo-400/40 animate-float" style={{ animationDuration: '4.5s', animationDelay: '-3.5s' }} />

        <div className="max-w-7xl mx-auto px-6 lg:px-8 w-full grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center relative">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-500/10 text-blue-600 border border-blue-200/60 mb-6">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered Career Matching
            </span>
            <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] leading-[1.1] font-bold text-slate-900 tracking-tight mb-6">
              Launch Your Career{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
                Into Orbit
              </span>
            </h1>
            <p className="text-lg text-slate-600 mb-8 leading-relaxed max-w-lg">
              Join Space42 and be part of humanity&apos;s journey to the stars. Chat with our AI assistant to find the perfect role — or browse open positions below.
            </p>
            <button
              onClick={scrollToCareers}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 text-sm font-semibold rounded-xl bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 hover:-translate-y-0.5 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all"
            >
              View Open Positions
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {/* AI Career Chat - properly sized, expandable (single instance to preserve messages) */}
          <div
            className={
              chatExpanded
                ? 'fixed inset-0 z-[1001] flex items-center justify-center p-4 md:p-8'
                : 'hidden lg:block w-full max-w-[400px] justify-self-end'
            }
          >
            {chatExpanded && (
              <div
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                onClick={() => setChatExpanded(false)}
                aria-hidden
              />
            )}
            <div
              className={`relative flex flex-col rounded-2xl border border-slate-200/80 overflow-hidden ${
                chatExpanded
                  ? 'w-full max-w-2xl h-[85vh] max-h-[700px] min-h-[500px] bg-white shadow-2xl'
                  : 'h-[420px] min-h-[420px] bg-white/75 backdrop-blur-md shadow-xl'
              }`}
              onClick={chatExpanded ? (e) => e.stopPropagation() : undefined}
            >
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-slate-50/50 shrink-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center">
                    <Bot className="h-4 w-4 text-white" />
                  </div>
                  <span className="font-semibold text-slate-900 text-sm">Career AI</span>
                </div>
                <button
                  type="button"
                  onClick={() => setChatExpanded(!chatExpanded)}
                  className="p-2 rounded-lg text-slate-500 hover:bg-slate-200 hover:text-slate-700 transition-colors"
                  title={chatExpanded ? 'Minimize' : 'Expand'}
                >
                  {chatExpanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                </button>
              </div>
              <div className="flex-1 min-h-0 flex flex-col overflow-hidden">
                <CareerChat
                  initialMessage="Hi! I'm Luna, your AI career assistant. Ask me about open roles, requirements, or paste your resume to get personalized suggestions."
                  expanded={chatExpanded}
                  hideHeader
                  className={cn(
                    "!border-0 !shadow-none rounded-none flex-1 min-h-0 flex flex-col overflow-hidden",
                    !chatExpanded && "!bg-transparent"
                  )}
                />
              </div>
            </div>
          </div>

          {/* Bottom strip - fills whitespace, bridges to next section (desktop) */}
          <div className="absolute bottom-8 left-0 right-0 hidden lg:flex flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 opacity-60">
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Zap className="h-3.5 w-3.5 text-blue-500" />
              AI matching
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Briefcase className="h-3.5 w-3.5 text-blue-500" />
              One-click apply
            </span>
            <span className="flex items-center gap-1.5 text-[12px] text-slate-500">
              <Shield className="h-3.5 w-3.5 text-blue-500" />
              Secure & private
            </span>
          </div>

          {/* Mobile: compact CTA */}
          <div className="lg:hidden rounded-2xl border border-slate-200 bg-white/90 backdrop-blur p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
                <Bot className="h-6 w-6 text-white" />
              </div>
              <div>
                <p className="font-semibold text-slate-900">AI Career Assistant</p>
                <p className="text-sm text-slate-500">Chat with Luna to find your perfect role</p>
              </div>
            </div>
            <Link
              href="/career"
              className="inline-flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/25"
            >
              Start conversation
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Job Listings - Rich SaaS section */}
      <section
        id="careers"
        className="py-24 lg:py-32 bg-gradient-to-b from-slate-50/80 to-white"
        style={{ scrollMarginTop: '110px' }}
      >
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="flex justify-between items-center flex-wrap gap-4 mb-12">
            <div>
              <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight">Open Positions</h2>
              <p className="text-slate-600 mt-2">Find your next opportunity at Space42</p>
              <Link href="/career" className="inline-flex items-center gap-1 text-sm text-blue-600 hover:underline">
                View all positions
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="flex gap-4">
              <select
                value={deptFilter}
                onChange={(e) => setDeptFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm cursor-pointer min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              >
                <option value="all">All Departments</option>
                {departments.map((d) => (
                  <option key={d} value={d.toLowerCase()}>
                    {d}
                  </option>
                ))}
                {departments.length === 0 && (
                  <>
                    <option value="engineering">Engineering</option>
                    <option value="science">Science</option>
                    <option value="operations">Operations</option>
                    <option value="hr">HR &amp; Talent</option>
                  </>
                )}
              </select>
              <select
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="px-4 py-2.5 border border-slate-200 rounded-lg bg-white text-slate-700 text-sm cursor-pointer min-w-[160px] focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400 transition-colors"
              >
                <option value="all">All Locations</option>
                {locations.map((loc) => (
                  <option key={loc} value={loc.toLowerCase()}>
                    {loc}
                  </option>
                ))}
                {locations.length === 0 && (
                  <>
                    <option value="mars">Mars Base</option>
                    <option value="earth">Earth HQ</option>
                    <option value="orbital">Orbital Station</option>
                    <option value="remote">Remote</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
              {filteredJobs.map((job) => (
                <Link
                  key={job.id}
                  href={`/career/${job.id}`}
                  className="block bg-white rounded-xl p-6 lg:p-8 border border-slate-200/80 shadow-sm hover:-translate-y-1 hover:shadow-lg hover:border-blue-200/60 transition-all cursor-pointer no-underline"
                >
                  <div className="flex justify-between items-start mb-4">
                    <h3 className="text-lg font-semibold text-slate-900">{job.title}</h3>
                    <span className="inline-block px-2.5 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium shrink-0">
                      {job.department}
                    </span>
                  </div>
                  <div className="flex gap-4 mb-4">
                    <span className="flex items-center gap-2 text-slate-500 text-sm">
                      <MapPin className="h-4 w-4 text-blue-500" />
                      {job.location}
                    </span>
                    <span className="flex items-center gap-2 text-slate-500 text-sm">
                      <Clock className="h-4 w-4 text-blue-500" />
                      {formatEmploymentType(job.employmentType)}
                    </span>
                  </div>
                  <p className="text-slate-600 mb-6 line-clamp-2 text-sm">{job.description}</p>
                  <div className="flex justify-between items-center">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        router.push(`/career/${job.id}`);
                      }}
                      className="px-4 py-2 text-sm font-medium rounded-lg bg-blue-600 text-white border-none cursor-pointer hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                    {formatSalary(job.salaryRangeMin, job.salaryRangeMax) && (
                      <span className="px-2.5 py-1 text-xs font-medium text-white rounded-full bg-blue-600">
                        {formatSalary(job.salaryRangeMin, job.salaryRangeMax)}
                      </span>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          )}

          {!loading && filteredJobs.length === 0 && (
            <div className="text-center py-16">
              <Briefcase className="h-16 w-16 text-slate-300 mx-auto mb-4" />
              <p className="text-slate-600 text-lg">
                No open positions match your filters. Check back soon!
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Features - Rich SaaS trust section */}
      <section className="py-20 lg:py-24 bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 lg:gap-12">
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center">
                <Zap className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">AI-Powered Matching</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Our AI assistant understands your skills and preferences to surface the best roles for you.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center">
                <Users className="h-6 w-6 text-indigo-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Join Visionary Teams</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Work with world-class talent on missions that push humanity forward.
                </p>
              </div>
            </div>
            <div className="flex gap-4">
              <div className="shrink-0 w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center">
                <Shield className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900 mb-2">Secure & Transparent</h3>
                <p className="text-slate-600 text-sm leading-relaxed">
                  Your data is protected. We use industry-leading security and clear privacy practices.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="py-20 lg:py-28 bg-slate-50/30" style={{ scrollMarginTop: '110px' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight mb-6">
            About Space42
          </h2>
          <p className="text-lg text-slate-600 leading-relaxed">
            Space42 is building the future of human exploration. We combine cutting-edge AI with
            human ingenuity to push the boundaries of what&apos;s possible. Join us in making the
            stars accessible.
          </p>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="py-20 lg:py-28 bg-white border-t border-slate-100" style={{ scrollMarginTop: '110px' }}>
        <div className="max-w-3xl mx-auto px-6 lg:px-8 text-center">
          <h2 className="text-3xl lg:text-4xl font-semibold text-slate-900 tracking-tight mb-6">
            Get in Touch
          </h2>
          <p className="text-lg text-slate-600 mb-8">
            Have questions about careers at Space42? We&apos;d love to hear from you.
          </p>
          <Link
            href="/career"
            className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-medium rounded-lg bg-blue-600 text-white no-underline hover:bg-blue-700 transition-colors shadow-sm"
          >
            Explore Careers
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>
      </section>
    </main>
  );
}
