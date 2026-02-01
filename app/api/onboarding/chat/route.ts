import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  applications,
  jobs,
  onboardingFlows,
  onboardingTasks,
  onboardingTemplateTasks,
  companyContext,
  companyDocuments,
} from '@/lib/db/schema';
import { getSessionUser } from '@/lib/auth/session';
import { eq, asc, and } from 'drizzle-orm';
import { openai } from '@/lib/ai/openai';
import { buildOnboardingAgentSystemPrompt } from '@/lib/ai/agents/onboarding-agent';
import { fetchUrlsAsText } from '@/lib/url/fetch-url-text';
import { sanitizeChatMessages } from '@/lib/chat/sanitize-messages';

/**
 * POST /api/onboarding/chat
 * Body: { messages: Array<{ role: 'user' | 'assistant', content: string }> }
 * Only for users who have an onboarding flow (application status = hired).
 * Returns AI response using company context + their job + onboarding tasks.
 */
export async function POST(request: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      );
    }

    const body = await request.json().catch(() => ({}));
    const rawMessages = Array.isArray(body.messages) ? body.messages : [];
    const messages = sanitizeChatMessages(rawMessages);
    const lastUser = messages.filter((m) => m.role === 'user').pop();
    if (!lastUser || !lastUser.content) {
      return NextResponse.json(
        { success: false, error: 'Invalid messages; need at least one user message' },
        { status: 400 }
      );
    }

    const [app] = await db
      .select({
        id: applications.id,
        jobId: applications.jobId,
        status: applications.status,
      })
      .from(applications)
      .where(and(eq(applications.candidateId, user.id), eq(applications.status, 'hired')))
      .limit(1);

    if (!app || app.status !== 'hired') {
      return NextResponse.json(
        { success: false, error: 'You do not have an active onboarding flow.' },
        { status: 403 }
      );
    }

    const [flow] = await db
      .select()
      .from(onboardingFlows)
      .where(eq(onboardingFlows.applicationId, app.id))
      .limit(1);

    if (!flow) {
      return NextResponse.json(
        { success: false, error: 'Onboarding flow not found.' },
        { status: 404 }
      );
    }

    const [jobRow] = await db
      .select({ title: jobs.title, department: jobs.department })
      .from(jobs)
      .where(eq(jobs.id, app.jobId))
      .limit(1);

    const tasks = await db
      .select({
        taskTitle: onboardingTasks.taskTitle,
        taskDescription: onboardingTasks.taskDescription,
        status: onboardingTasks.status,
        category: onboardingTemplateTasks.category,
      })
      .from(onboardingTasks)
      .leftJoin(
        onboardingTemplateTasks,
        eq(onboardingTasks.templateTaskId, onboardingTemplateTasks.id)
      )
      .where(eq(onboardingTasks.onboardingFlowId, flow.id))
      .orderBy(asc(onboardingTasks.createdAt));

    const [contextRows, docRows] = await Promise.all([
      db.select().from(companyContext),
      db.select({ name: companyDocuments.name, extractedText: companyDocuments.extractedText }).from(companyDocuments),
    ]);

    const companyContextMap: Record<string, string> = {};
    for (const r of contextRows) {
      companyContextMap[r.key] = r.value ?? '';
    }

    const MAX_DOCS_TOTAL = 50000;
    let companyDocumentsText = '';
    for (const d of docRows) {
      if (!d.extractedText?.trim()) continue;
      const chunk = `--- ${d.name} ---\n${d.extractedText}`;
      if (companyDocumentsText.length + chunk.length > MAX_DOCS_TOTAL) {
        companyDocumentsText += chunk.slice(0, MAX_DOCS_TOTAL - companyDocumentsText.length) + '\n…';
        break;
      }
      companyDocumentsText += chunk + '\n\n';
    }

    const companyUrlsRaw = companyContextMap.company_urls?.trim() || '';
    const urlList = companyUrlsRaw.split(/\n/).map((u) => u.trim()).filter(Boolean);
    const { text: companyUrlsText } = urlList.length > 0 ? await fetchUrlsAsText(urlList) : { text: '' };
    const departmentContacts = companyContextMap.department_contacts?.trim() || '';

    const systemPrompt = buildOnboardingAgentSystemPrompt({
      companyContext: companyContextMap,
      companyDocumentsText: companyDocumentsText || undefined,
      companyUrlsText: companyUrlsText || undefined,
      departmentContacts: departmentContacts || undefined,
      jobTitle: jobRow?.title ?? 'Your role',
      jobDepartment: jobRow?.department ?? '',
      onboardingTasks: tasks.map((t) => ({
        taskTitle: t.taskTitle,
        taskDescription: t.taskDescription,
        status: t.status,
        category: t.category ?? 'other',
      })),
      candidateName: user.name,
    });

    const chatMessages = [
      { role: 'system' as const, content: systemPrompt },
      ...messages.slice(-20).map((m) => ({ role: m.role, content: m.content })),
    ];

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: chatMessages,
      max_tokens: 800,
    });

    const choice = response.choices[0];
    const content = choice?.message?.content ?? 'Sorry, I could not generate a response.';

    return NextResponse.json({
      success: true,
      message: { role: 'assistant', content },
    });
  } catch (error) {
    console.error('Onboarding chat error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to get response' },
      { status: 500 }
    );
  }
}
