'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CareerChat } from '@/app/components/CareerChat';
import { Briefcase, MapPin, DollarSign, ArrowLeft } from 'lucide-react';

type Job = {
  id: string;
  title: string;
  department: string;
  location: string;
  employmentType: string;
  salaryRangeMin: number | null;
  salaryRangeMax: number | null;
  description: string;
  requirements: string[];
  responsibilities: string[];
};

export default function JobDetailPage({ params }: { params: Promise<{ jobId: string }> }) {
  const router = useRouter();
  const [job, setJob] = useState<Job | null>(null);
  const [loading, setLoading] = useState(true);
  const [jobId, setJobId] = useState<string>('');

  useEffect(() => {
    params.then((p) => {
      setJobId(p.jobId);
      fetchJob(p.jobId);
    });
  }, [params]);

  const fetchJob = async (id: string) => {
    try {
      const response = await fetch(`/api/jobs/${id}`);
      const data = await response.json();
      if (data.success) {
        setJob(data.job);
      }
    } catch (error) {
      console.error('Failed to fetch job:', error);
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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading job details...</p>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="p-8 text-center">
          <p className="text-gray-600 mb-4">Job not found</p>
          <Button onClick={() => router.push('/career')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Careers
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto py-6 px-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/career')}
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to all jobs
          </Button>

          <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
            {job.title}
          </h1>

          <div className="flex flex-wrap gap-3 mb-4">
            <Badge variant="outline">
              <Briefcase className="h-3 w-3 mr-1" />
              {job.department}
            </Badge>
            <Badge variant="outline">
              <MapPin className="h-3 w-3 mr-1" />
              {job.location}
            </Badge>
            <Badge>{getEmploymentTypeLabel(job.employmentType)}</Badge>
            {formatSalary(job.salaryRangeMin, job.salaryRangeMax) && (
              <Badge variant="success">
                <DollarSign className="h-3 w-3 mr-1" />
                {formatSalary(job.salaryRangeMin, job.salaryRangeMax)}
              </Badge>
            )}
          </div>

        </div>
      </div>

      {/* Job Details + Chat */}
      <div className="max-w-6xl mx-auto py-8 px-4 flex flex-col lg:flex-row gap-8">
        <div className="flex-1 min-w-0">
        <div className="space-y-6">
          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle>About the Role</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-700 whitespace-pre-line">{job.description}</p>
            </CardContent>
          </Card>

          {/* Responsibilities */}
          <Card>
            <CardHeader>
              <CardTitle>Responsibilities</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.responsibilities.map((resp, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{resp}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Requirements */}
          <Card>
            <CardHeader>
              <CardTitle>Requirements</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {job.requirements.map((req, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-600 mt-1">•</span>
                    <span className="text-gray-700">{req}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {/* Apply CTA */}
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="pt-6">
              <div className="text-center">
                <h3 className="text-xl font-semibold text-gray-900 mb-2">
                  Ready to apply?
                </h3>
                <p className="text-gray-600 mb-4">
                  Use the chat on the right to start your application with our AI assistant.
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
        </div>

        <aside className="lg:w-[380px] shrink-0">
          <div className="lg:sticky lg:top-6">
            <CareerChat
              jobId={jobId}
              initialMessage={`Hi! I'm here to help you apply for the ${job.title} role. Would you like to start the application, or do you have any questions about the position?`}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
