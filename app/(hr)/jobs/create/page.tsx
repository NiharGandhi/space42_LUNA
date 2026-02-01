'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import Link from 'next/link';
import { Plus, X } from 'lucide-react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

export default function CreateJobPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    department: '',
    location: '',
    employmentType: 'full_time' as const,
    description: '',
    salaryRangeMin: '',
    salaryRangeMax: '',
    status: 'active' as const,
  });

  const [requirements, setRequirements] = useState<string[]>(['']);
  const [responsibilities, setResponsibilities] = useState<string[]>(['']);

  const addRequirement = () => setRequirements([...requirements, '']);
  const removeRequirement = (index: number) => {
    setRequirements(requirements.filter((_, i) => i !== index));
  };
  const updateRequirement = (index: number, value: string) => {
    const updated = [...requirements];
    updated[index] = value;
    setRequirements(updated);
  };

  const addResponsibility = () => setResponsibilities([...responsibilities, '']);
  const removeResponsibility = (index: number) => {
    setResponsibilities(responsibilities.filter((_, i) => i !== index));
  };
  const updateResponsibility = (index: number, value: string) => {
    const updated = [...responsibilities];
    updated[index] = value;
    setResponsibilities(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const jobData = {
        ...formData,
        requirements: requirements.filter((r) => r.trim() !== ''),
        responsibilities: responsibilities.filter((r) => r.trim() !== ''),
        salaryRangeMin: formData.salaryRangeMin
          ? parseInt(formData.salaryRangeMin)
          : undefined,
        salaryRangeMax: formData.salaryRangeMax
          ? parseInt(formData.salaryRangeMax)
          : undefined,
      };

      const response = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(jobData),
      });

      const data = await response.json();

      if (data.success) {
        router.push('/jobs');
      } else {
        setError(data.error || 'Failed to create job');
      }
    } catch (err) {
      setError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto max-w-6xl px-4 py-6">
      <div className="max-w-4xl">
        <div className="mb-4">
          <Breadcrumbs
            items={[
              { label: 'Dashboard', href: '/dashboard' },
              { label: 'Jobs', href: '/jobs' },
              { label: 'Create' },
            ]}
          />
        </div>
        <div className="mb-6">
          <h1 className="text-[22px] font-semibold text-slate-900">Create new job posting</h1>
          <p className="text-gray-600 mt-1">Fill in the details to create a new job opening</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Job Title *
                  </label>
                  <Input
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Senior Software Engineer"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Department *
                  </label>
                  <Input
                    value={formData.department}
                    onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                    placeholder="e.g. Engineering"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Location *
                  </label>
                  <Input
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    placeholder="e.g. Remote / San Francisco, CA"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Employment Type *
                  </label>
                  <select
                    value={formData.employmentType}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        employmentType: e.target.value as any,
                      })
                    }
                    className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                    required
                  >
                    <option value="full_time">Full Time</option>
                    <option value="part_time">Part Time</option>
                    <option value="contract">Contract</option>
                    <option value="internship">Internship</option>
                  </select>
                </div>
              </div>

              {/* Salary Range */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Min Salary (USD)
                  </label>
                  <Input
                    type="number"
                    value={formData.salaryRangeMin}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryRangeMin: e.target.value })
                    }
                    placeholder="e.g. 100000"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Max Salary (USD)
                  </label>
                  <Input
                    type="number"
                    value={formData.salaryRangeMax}
                    onChange={(e) =>
                      setFormData({ ...formData, salaryRangeMax: e.target.value })
                    }
                    placeholder="e.g. 150000"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Job Description *
                </label>
                <Textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the role, team, and what makes this opportunity great..."
                  rows={6}
                  required
                />
              </div>

              {/* Requirements */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Requirements *
                </label>
                <div className="space-y-2">
                  {requirements.map((req, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={req}
                        onChange={(e) => updateRequirement(index, e.target.value)}
                        placeholder="e.g. 5+ years of React experience"
                      />
                      {requirements.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeRequirement(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addRequirement}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Requirement
                  </Button>
                </div>
              </div>

              {/* Responsibilities */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Responsibilities *
                </label>
                <div className="space-y-2">
                  {responsibilities.map((resp, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        value={resp}
                        onChange={(e) => updateResponsibility(index, e.target.value)}
                        placeholder="e.g. Lead frontend architecture decisions"
                      />
                      {responsibilities.length > 1 && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => removeResponsibility(index)}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addResponsibility}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Responsibility
                  </Button>
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status *
                </label>
                <select
                  value={formData.status}
                  onChange={(e) =>
                    setFormData({ ...formData, status: e.target.value as any })
                  }
                  className="flex h-10 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm"
                  required
                >
                  <option value="draft">Draft</option>
                  <option value="active">Active</option>
                  <option value="paused">Paused</option>
                </select>
              </div>

              {error && (
                <div className="p-3 rounded-lg bg-red-50 border border-red-200">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => router.push('/jobs')}
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={loading}>
                  {loading ? 'Creating...' : 'Create Job Posting'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
