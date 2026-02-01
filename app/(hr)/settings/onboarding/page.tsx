'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Plus,
  Trash2,
  Save,
  Building2,
  FileText,
  Upload,
  ChevronDown,
  ChevronUp,
  Check,
  Bot,
  Settings2,
  LayoutList,
  Zap,
  Send,
  Loader2,
  Copy,
  FileStack,
} from 'lucide-react';
import { Breadcrumbs } from '@/app/components/Breadcrumbs';

type Template = {
  id: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  taskCount: number;
  createdAt: string;
};

type TemplateTask = {
  id: string;
  taskTitle: string;
  taskDescription: string | null;
  taskOrder: number;
  category: string;
  isRequired: boolean;
  estimatedDays: number | null;
  requiresSubmission?: boolean;
  submissionDescription?: string | null;
};

type GeneratedTask = {
  taskTitle: string;
  category: string;
  taskDescription: string | null;
  requiresSubmission: boolean;
  submissionDescription: string | null;
};

type CompanyDocument = {
  id: string;
  name: string;
  fileKey: string;
  hasExtractedText: boolean;
  createdAt: string;
};

type OnboardingMode = 'ai' | 'manual' | 'combined';

const TASK_CATEGORIES = [
  { value: 'documentation', label: 'Documentation' },
  { value: 'it_setup', label: 'IT Setup' },
  { value: 'visa', label: 'Visa' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'background_check', label: 'Background Check' },
  { value: 'other', label: 'Other' },
];

const AI_SUGGESTIONS = [
  'Remote software engineer — include visa, background check, IT setup, signed offer',
  'Onsite designer — documents, equipment, office tour, handbook',
  'Contract developer — W-9, NDA, project kickoff',
];

export default function HRSettingsOnboardingPage() {
  const [context, setContext] = useState<Record<string, string>>({});
  const [contextLoading, setContextLoading] = useState(true);
  const [contextSaving, setContextSaving] = useState(false);
  const [savedOnce, setSavedOnce] = useState(false);
  const [documents, setDocuments] = useState<CompanyDocument[]>([]);
  const [documentsLoading, setDocumentsLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(true);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [templateTasks, setTemplateTasks] = useState<TemplateTask[]>([]);
  const [templateTasksLoading, setTemplateTasksLoading] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('documentation');
  const [newTaskRequiresDoc, setNewTaskRequiresDoc] = useState(false);
  const [newTaskSubmissionDesc, setNewTaskSubmissionDesc] = useState('');
  const [addingTask, setAddingTask] = useState(false);
  const [openSection, setOpenSection] = useState<string | null>('checklist');
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [useCompanyContext, setUseCompanyContext] = useState(true);
  const [generatedTasks, setGeneratedTasks] = useState<GeneratedTask[]>([]);
  const [onboardingMode, setOnboardingMode] = useState<OnboardingMode>('combined');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{ role: 'user' | 'assistant'; content: string }>>([]);

  useEffect(() => {
    (async () => {
      try {
        const [ctxRes, tplRes, docsRes] = await Promise.all([
          fetch('/api/hr/company-context'),
          fetch('/api/hr/onboarding-templates'),
          fetch('/api/hr/company-documents'),
        ]);
        const ctxData = await ctxRes.json();
        const tplData = await tplRes.json();
        const docsData = await docsRes.json();
        if (ctxData.success && ctxData.context) setContext(ctxData.context);
        if (tplData.success && Array.isArray(tplData.templates)) {
          setTemplates(tplData.templates);
          const defaultTpl = tplData.templates.find((t: Template) => t.isDefault) ?? tplData.templates[0];
          if (defaultTpl) setSelectedTemplateId(defaultTpl.id);
        }
        if (docsData.success && Array.isArray(docsData.documents)) setDocuments(docsData.documents);
      } catch (e) {
        console.error(e);
      } finally {
        setContextLoading(false);
        setTemplatesLoading(false);
        setDocumentsLoading(false);
      }
    })();
  }, []);

  useEffect(() => {
    if (!selectedTemplateId) {
      setTemplateTasks([]);
      return;
    }
    setTemplateTasksLoading(true);
    fetch(`/api/hr/onboarding-templates/${selectedTemplateId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) setTemplateTasks(data.tasks ?? []);
      })
      .catch(console.error)
      .finally(() => setTemplateTasksLoading(false));
  }, [selectedTemplateId]);

  const saveContext = async () => {
    setContextSaving(true);
    setSavedOnce(false);
    try {
      const res = await fetch('/api/hr/company-context', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates: context }),
      });
      const data = await res.json();
      if (data.success) setSavedOnce(true);
      else alert(data.error || 'Failed to save');
    } catch {
      alert('Failed to save');
    } finally {
      setContextSaving(false);
    }
  };

  const createTemplate = async () => {
    const name = 'New template';
    try {
      const res = await fetch('/api/hr/onboarding-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, isDefault: templates.length === 0 }),
      });
      const data = await res.json();
      if (data.success && data.template) {
        setTemplates((prev) => [...prev, { ...data.template, taskCount: 0 }]);
        setSelectedTemplateId(data.template.id);
      } else alert(data.error || 'Failed to create');
    } catch {
      alert('Failed to create template');
    }
  };

  const setDefaultTemplate = async (id: string) => {
    try {
      await fetch(`/api/hr/onboarding-templates/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isDefault: true }),
      });
      setTemplates((prev) => prev.map((t) => ({ ...t, isDefault: t.id === id })));
    } catch {
      alert('Failed to set default');
    }
  };

  const addTask = async () => {
    if (!selectedTemplateId || !newTaskTitle.trim() || addingTask) return;
    setAddingTask(true);
    try {
      const res = await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}/tasks`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          taskTitle: newTaskTitle.trim(),
          category: newTaskCategory,
          requiresSubmission: newTaskRequiresDoc,
          submissionDescription: newTaskRequiresDoc && newTaskSubmissionDesc.trim() ? newTaskSubmissionDesc.trim() : null,
        }),
      });
      const data = await res.json();
      if (data.success && data.task) {
        setTemplateTasks((prev) => [...prev, data.task].sort((a, b) => a.taskOrder - b.taskOrder));
        setNewTaskTitle('');
        setNewTaskRequiresDoc(false);
        setNewTaskSubmissionDesc('');
      } else alert(data.error || 'Failed to add task');
    } catch {
      alert('Failed to add task');
    } finally {
      setAddingTask(false);
    }
  };

  const generateFlow = useCallback(async (promptText?: string) => {
    const text = (promptText ?? aiPrompt).trim();
    if (!text || aiLoading) return;
    setAiLoading(true);
    setGeneratedTasks([]);
    setAiChatMessages((prev) => [...prev, { role: 'user', content: text }]);
    setAiPrompt('');
    try {
      const res = await fetch('/api/hr/onboarding-templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: text,
          useCompanyContext,
          existingTasks: generatedTasks.length > 0 ? generatedTasks : undefined,
        }),
      });
      const data = await res.json();
      if (data.success && Array.isArray(data.tasks)) {
        setGeneratedTasks(data.tasks);
        const summary = `I've generated ${data.tasks.length} onboarding steps:\n\n${data.tasks.map((t: GeneratedTask, i: number) => `${i + 1}. **${t.taskTitle}** (${t.category})${t.requiresSubmission ? ` — Submit: ${t.submissionDescription}` : ''}`).join('\n')}\n\nYou can replace your template, add to it, or ask me to refine.`;
        setAiChatMessages((prev) => [...prev, { role: 'assistant', content: summary }]);
      } else {
        setAiChatMessages((prev) => [...prev, { role: 'assistant', content: data.error || 'Sorry, I couldn\'t generate steps. Try again.' }]);
      }
    } catch {
      setAiChatMessages((prev) => [...prev, { role: 'assistant', content: 'Something went wrong. Please try again.' }]);
    } finally {
      setAiLoading(false);
    }
  }, [aiPrompt, aiLoading, useCompanyContext, generatedTasks]);

  const refetchTemplateTasks = async () => {
    if (!selectedTemplateId) return;
    const res = await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}`);
    const data = await res.json();
    if (data.success && data.tasks) setTemplateTasks(data.tasks);
  };

  const applyGeneratedReplace = async () => {
    if (!selectedTemplateId || generatedTasks.length === 0) return;
    try {
      for (const t of templateTasks) {
        await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}/tasks/${t.id}`, { method: 'DELETE' });
      }
      for (let i = 0; i < generatedTasks.length; i++) {
        const t = generatedTasks[i];
        await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskTitle: t.taskTitle,
            category: t.category,
            taskDescription: t.taskDescription,
            taskOrder: i + 1,
            requiresSubmission: t.requiresSubmission,
            submissionDescription: t.submissionDescription,
          }),
        });
      }
      await refetchTemplateTasks();
      setGeneratedTasks([]);
      setAiPrompt('');
      setAiChatMessages((prev) => [...prev, { role: 'assistant', content: 'Done! I\'ve replaced your template with the generated steps.' }]);
    } catch {
      alert('Failed to apply');
    }
  };

  const applyGeneratedAdd = async () => {
    if (!selectedTemplateId || generatedTasks.length === 0) return;
    try {
      for (let i = 0; i < generatedTasks.length; i++) {
        const t = generatedTasks[i];
        await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}/tasks`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            taskTitle: t.taskTitle,
            category: t.category,
            taskDescription: t.taskDescription,
            requiresSubmission: t.requiresSubmission,
            submissionDescription: t.submissionDescription,
          }),
        });
      }
      await refetchTemplateTasks();
      setGeneratedTasks([]);
      setAiPrompt('');
      setAiChatMessages((prev) => [...prev, { role: 'assistant', content: 'Done! I\'ve added the generated steps to your template.' }]);
    } catch {
      alert('Failed to add');
    }
  };

  const deleteTask = async (taskId: string) => {
    if (!selectedTemplateId || !confirm('Remove this task?')) return;
    try {
      const res = await fetch(`/api/hr/onboarding-templates/${selectedTemplateId}/tasks/${taskId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setTemplateTasks((prev) => prev.filter((t) => t.id !== taskId));
      else alert(data.error || 'Failed to delete');
    } catch {
      alert('Failed to delete task');
    }
  };

  const uploadDocument = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploading) return;
    setUploading(true);
    e.target.value = '';
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch('/api/hr/company-documents', { method: 'POST', body: formData });
      const data = await res.json();
      if (data.success && data.document) setDocuments((prev) => [data.document, ...prev]);
      else alert(data.error || 'Upload failed');
    } catch {
      alert('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const deleteDocument = async (documentId: string) => {
    if (!confirm('Remove this document?')) return;
    try {
      const res = await fetch(`/api/hr/company-documents/${documentId}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) setDocuments((prev) => prev.filter((d) => d.id !== documentId));
      else alert(data.error || 'Failed to delete');
    } catch {
      alert('Failed to delete');
    }
  };

  const toggleSection = (key: string) => {
    setOpenSection((s) => (s === key ? null : key));
  };

  if (contextLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
          <p className="text-sm text-slate-500">Loading onboarding settings…</p>
        </div>
      </div>
    );
  }

  const defaultTemplate = templates.find((t) => t.isDefault) ?? templates[0];
  const handbookOrAbout = context.handbook?.trim() || context.about?.trim() || '';

  return (
    <main className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
      <div className="mb-6">
        <Breadcrumbs items={[{ label: 'Dashboard', href: '/dashboard' }, { label: 'Settings', href: '/settings/onboarding' }, { label: 'Onboarding' }]} />
      </div>

      <div className="mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-600 hover:text-slate-900">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to dashboard
          </Button>
        </Link>
      </div>

      <div className="mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">Onboarding Setup</h1>
        <p className="mt-1 text-slate-600">Configure how new hires complete onboarding — use AI, manual steps, or both.</p>
      </div>

      {/* Mode selector */}
      <Card className="p-4 sm:p-6 mb-6 border border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <h2 className="text-sm font-semibold text-slate-900 mb-3 flex items-center gap-2">
          <Settings2 className="h-4 w-4 text-slate-500" />
          Creation mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { id: 'ai' as const, icon: Bot, label: 'AI-assisted', desc: 'Chat with AI to build steps' },
            { id: 'manual' as const, icon: LayoutList, label: 'Manual', desc: 'Add and edit steps yourself' },
            { id: 'combined' as const, icon: Zap, label: 'Combined', desc: 'AI suggestions + manual edits' },
          ]).map(({ id, icon: Icon, label, desc }) => (
            <button
              key={id}
              type="button"
              onClick={() => setOnboardingMode(id)}
              className={`flex items-start gap-3 p-4 rounded-xl border-2 text-left transition-all ${
                onboardingMode === id
                  ? 'border-blue-500 bg-blue-50/50'
                  : 'border-slate-200 hover:border-slate-300 bg-slate-50/30'
              }`}
            >
              <div className={`p-2 rounded-lg ${onboardingMode === id ? 'bg-blue-100' : 'bg-slate-200/60'}`}>
                <Icon className={`h-5 w-5 ${onboardingMode === id ? 'text-blue-600' : 'text-slate-500'}`} />
              </div>
              <div>
                <span className="block font-medium text-slate-900">{label}</span>
                <span className="block text-xs text-slate-500 mt-0.5">{desc}</span>
              </div>
            </button>
          ))}
        </div>
      </Card>

      {/* Company context — compact */}
      <Card className="p-4 sm:p-6 mb-6 border border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <button
          type="button"
          onClick={() => toggleSection('company')}
          className="w-full flex items-center justify-between text-left"
        >
          <h2 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-slate-500" />
            Company context
          </h2>
          {openSection === 'company' ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
        {openSection === 'company' && (
          <div className="mt-4 pt-4 border-t border-slate-100 space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Company name</label>
              <input
                type="text"
                value={context.company_name ?? ''}
                onChange={(e) => setContext((c) => ({ ...c, company_name: e.target.value }))}
                placeholder="e.g. Acme Inc"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Handbook or about</label>
              <textarea
                value={handbookOrAbout}
                onChange={(e) => {
                  const v = e.target.value;
                  setContext((c) => ({ ...c, handbook: v, about: v }));
                }}
                rows={2}
                placeholder="URL or short intro…"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-2">Documents</label>
              {documentsLoading ? (
                <p className="text-sm text-slate-500">Loading…</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {documents.map((d) => (
                    <span key={d.id} className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                      <FileText className="h-3.5 w-3.5" />
                      {d.name}
                      <button type="button" onClick={() => deleteDocument(d.id)} className="text-slate-400 hover:text-red-600" aria-label="Remove">×</button>
                    </span>
                  ))}
                  <label className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-slate-300 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    {uploading ? 'Uploading…' : 'Upload'}
                    <input type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" disabled={uploading} onChange={uploadDocument} />
                  </label>
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <Button onClick={saveContext} disabled={contextSaving} size="sm">
                <Save className="h-4 w-4 mr-2" />
                {contextSaving ? 'Saving…' : 'Save'}
              </Button>
              {savedOnce && <span className="flex items-center gap-1 text-sm text-emerald-600"><Check className="h-4 w-4" /> Saved</span>}
            </div>
          </div>
        )}
      </Card>

      {/* Templates & Checklist — AI + Manual */}
      <Card className="overflow-hidden border border-slate-200/80 bg-white shadow-sm rounded-2xl">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 sm:px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                <FileStack className="h-4 w-4 text-slate-500" />
                Templates
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {defaultTemplate && `${defaultTemplate.name} (${defaultTemplate.taskCount} tasks) · `}
                Select a template to edit
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setSelectedTemplateId(t.id)}
                  className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                    selectedTemplateId === t.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
                  }`}
                >
                  {t.name}
                  {t.isDefault && ' ★'}
                </button>
              ))}
              <Button size="sm" variant="outline" onClick={createTemplate}>
                <Plus className="h-4 w-4 mr-1" /> New
              </Button>
              {templates.length > 1 && selectedTemplateId && (
                <Button size="sm" variant="ghost" onClick={() => setDefaultTemplate(selectedTemplateId)} disabled={templates.find((t) => t.id === selectedTemplateId)?.isDefault}>
                  Set default
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Agent panel */}
            {(onboardingMode === 'ai' || onboardingMode === 'combined') && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/30 overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500/10 to-purple-500/10 px-4 py-3 border-b border-slate-200">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-indigo-100">
                      <Bot className="h-4 w-4 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold text-slate-900">AI Onboarding Agent</h3>
                      <p className="text-xs text-slate-500">Describe your needs, I&apos;ll suggest steps</p>
                    </div>
                  </div>
                </div>
                <div className="p-4 min-h-[280px] max-h-[400px] overflow-y-auto space-y-4">
                  {aiChatMessages.length === 0 && (
                    <div className="space-y-3">
                      <p className="text-sm text-slate-600">Try one of these prompts:</p>
                      {AI_SUGGESTIONS.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => generateFlow(s)}
                          disabled={aiLoading}
                          className="block w-full text-left px-3 py-2 rounded-lg bg-white border border-slate-200 text-sm text-slate-700 hover:border-indigo-300 hover:bg-indigo-50/50 transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  )}
                  {aiChatMessages.map((m, i) => (
                    <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[90%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-indigo-600 text-white' : 'bg-white border border-slate-200 text-slate-700'}`}>
                        {m.content.split('\n').map((line, j) => (
                          <p key={j} className={j > 0 ? 'mt-1' : ''}>{line.replace(/\*\*(.*?)\*\*/g, '$1')}</p>
                        ))}
                      </div>
                    </div>
                  ))}
                  {aiLoading && (
                    <div className="flex items-center gap-2 text-slate-500">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span className="text-sm">Generating steps…</span>
                    </div>
                  )}
                </div>
                {generatedTasks.length > 0 && (
                  <div className="px-4 py-3 border-t border-slate-200 bg-white flex flex-wrap gap-2">
                    <Button size="sm" onClick={applyGeneratedReplace} variant="outline">
                      <Copy className="h-3.5 w-3.5 mr-1" /> Replace template
                    </Button>
                    <Button size="sm" onClick={applyGeneratedAdd} variant="outline">
                      <Plus className="h-3.5 w-3.5 mr-1" /> Add to template
                    </Button>
                  </div>
                )}
                <div className="p-4 border-t border-slate-200 flex gap-2">
                  <input
                    type="text"
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateFlow()}
                    placeholder="e.g. Add visa steps for remote hires…"
                    className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400"
                  />
                  <Button size="sm" onClick={() => generateFlow()} disabled={aiLoading || !aiPrompt.trim()}>
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}

            {/* Tasks panel */}
            <div className="rounded-xl border border-slate-200 bg-white">
              <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-slate-900">
                  {selectedTemplateId ? 'Tasks' : 'Select a template'}
                </h3>
                {selectedTemplateId && (
                  <label className="flex items-center gap-2 text-xs text-slate-600">
                    <input type="checkbox" checked={useCompanyContext} onChange={(e) => setUseCompanyContext(e.target.checked)} />
                    Use company context for AI
                  </label>
                )}
              </div>
              <div className="p-4 min-h-[200px]">
                {!selectedTemplateId ? (
                  <p className="text-sm text-slate-500">Create or select a template to add tasks.</p>
                ) : templateTasksLoading ? (
                  <div className="flex items-center gap-2 text-slate-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading…
                  </div>
                ) : (
                  <div className="space-y-4">
                    <ul className="space-y-2">
                      {templateTasks.map((t) => (
                        <li key={t.id} className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
                          <span className="text-slate-700 flex-1">{t.taskOrder}. {t.taskTitle}</span>
                          {t.submissionDescription && <span className="text-xs text-amber-600">(upload)</span>}
                          <button type="button" onClick={() => deleteTask(t.id)} className="p-1 text-slate-400 hover:text-red-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                    {(onboardingMode === 'manual' || onboardingMode === 'combined') && (
                      <div className="flex flex-wrap gap-2 items-end pt-2 border-t border-slate-100">
                        <input
                          type="text"
                          value={newTaskTitle}
                          onChange={(e) => setNewTaskTitle(e.target.value)}
                          placeholder="New task"
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-40 focus:ring-2 focus:ring-blue-500/20"
                        />
                        <select value={newTaskCategory} onChange={(e) => setNewTaskCategory(e.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm">
                          {TASK_CATEGORIES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                        </select>
                        <label className="flex items-center gap-1.5 text-sm text-slate-600">
                          <input type="checkbox" checked={newTaskRequiresDoc} onChange={(e) => setNewTaskRequiresDoc(e.target.checked)} />
                          Doc
                        </label>
                        {newTaskRequiresDoc && (
                          <input
                            type="text"
                            value={newTaskSubmissionDesc}
                            onChange={(e) => setNewTaskSubmissionDesc(e.target.value)}
                            placeholder="What to submit"
                            className="rounded-lg border border-slate-200 px-3 py-2 text-sm w-36 focus:ring-2 focus:ring-blue-500/20"
                          />
                        )}
                        <Button size="sm" onClick={addTask} disabled={addingTask || !newTaskTitle.trim()}>
                          {addingTask ? '…' : 'Add'}
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Expandable: More company details */}
      <div className="mt-6 space-y-2">
        {[
          { key: 'playbooks', label: 'Visa, IT & documents', fields: [{ key: 'visa_instructions', label: 'Visa' }, { key: 'background_check_instructions', label: 'Background check' }, { key: 'it_setup_instructions', label: 'IT setup' }, { key: 'id_help_instructions', label: 'ID & docs' }] },
          { key: 'urls', label: 'URLs & contacts', fields: [{ key: 'company_urls', label: 'URLs' }, { key: 'department_contacts', label: 'Contacts' }] },
        ].map(({ key, label, fields }) => (
          <Card key={key} className="overflow-hidden border border-slate-200/80 rounded-xl">
            <button type="button" onClick={() => toggleSection(key)} className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-slate-50/50">
              <span className="text-sm font-medium text-slate-700">{label}</span>
              {openSection === key ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            {openSection === key && (
              <div className="border-t border-slate-100 px-4 py-3 space-y-3 bg-slate-50/30">
                {fields.map(({ key: fk, label: fl }) => (
                  <div key={fk}>
                    <label className="block text-xs font-medium text-slate-500 mb-1">{fl}</label>
                    <textarea value={context[fk] ?? ''} onChange={(e) => setContext((c) => ({ ...c, [fk]: e.target.value }))} rows={2} className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" placeholder="Optional" />
                  </div>
                ))}
                <Button size="sm" onClick={saveContext} disabled={contextSaving}>Save</Button>
              </div>
            )}
          </Card>
        ))}
      </div>
    </main>
  );
}
