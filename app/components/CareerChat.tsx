'use client';

import { useRef, useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { MessageCircle, Send, Loader2, Paperclip, FileText, LogIn } from 'lucide-react';
import { cn } from '@/lib/utils/cn';
import { ChatMessageContent } from '@/app/components/ChatMessageContent';

export type ChatMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
};

type SessionUser = { id: string; email: string; name: string | null; role: string };

type CareerChatProps = {
  jobId?: string;
  initialMessage?: string;
  className?: string;
  expanded?: boolean;
  hideHeader?: boolean;
  headerTitle?: string;
  /** Max height of the messages area (px) so it stays scrollable. Default 320. */
  maxMessagesHeight?: number;
};

export function CareerChat({
  jobId,
  initialMessage,
  className,
  expanded = false,
  hideHeader = false,
  headerTitle = 'Application assistant',
  maxMessagesHeight = 320,
}: CareerChatProps) {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    if (initialMessage) {
      return [
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: initialMessage,
        },
      ];
    }
    return [];
  });
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeAttachment, setResumeAttachment] = useState<{
    fileKey: string;
    url: string;
    fileName: string;
    resumeText?: string;
  } | null>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [user, setUser] = useState<SessionUser | null>(null);
  const [authStep, setAuthStep] = useState<'idle' | 'email' | 'code'>('idle');
  const [authEmail, setAuthEmail] = useState('');
  const [authCode, setAuthCode] = useState('');
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/auth/session')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.user) setUser(data.user);
      })
      .catch(() => setUser(null));
  }, []);

  const handleSendCode = async () => {
    const email = authEmail.trim().toLowerCase();
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setAuthError('Please enter a valid email address.');
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Failed to send code');
      setAuthStep('code');
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Failed to send code. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    const code = authCode.replace(/\D/g, '').slice(0, 6);
    if (code.length !== 6) {
      setAuthError('Please enter the 6-digit code from your email.');
      return;
    }
    setAuthError(null);
    setAuthLoading(true);
    try {
      const res = await fetch('/api/auth/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: authEmail.trim().toLowerCase(), code }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Invalid or expired code');
      if (data.success && data.user) {
        setUser(data.user);
        setAuthStep('idle');
        setAuthEmail('');
        setAuthCode('');
      }
    } catch (e) {
      setAuthError(e instanceof Error ? e.message : 'Invalid code. Try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const scrollToBottom = () => {
    const el = messagesContainerRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: text,
    };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    const assistantId = crypto.randomUUID();
    setMessages((prev) => [
      ...prev,
      { id: assistantId, role: 'assistant', content: '' },
    ]);

    try {
      const bodyMessages = [...messages, userMessage].map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: bodyMessages,
          ...(jobId && { jobId }),
          ...(resumeAttachment && {
            resumeUrl: resumeAttachment.url,
            resumeFileKey: resumeAttachment.fileKey,
            ...(resumeAttachment.resumeText && {
              resumeText: resumeAttachment.resumeText,
            }),
          }),
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to get response');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let streamed = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          streamed += decoder.decode(value, { stream: true });
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: streamed } : m
            )
          );
        }
      }
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, content: errorMessage } : m
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || uploadingResume) return;
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    ];
    if (!allowedTypes.includes(file.type)) {
      return;
    }
    setUploadingResume(true);
    try {
      const formData = new FormData();
      formData.set('file', file);
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error ?? 'Upload failed');
      const attachment = {
        fileKey: data.fileKey,
        url: data.url,
        fileName: file.name,
        ...(data.resumeText && { resumeText: data.resumeText }),
      };
      setResumeAttachment(attachment);
      const userMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: 'user',
        content: `I've uploaded my resume: ${file.name}`,
      };
      setMessages((prev) => [...prev, userMessage]);

      // When we couldn't extract text, show a clear message so the user knows to paste
      if (!data.resumeTextExtracted || !data.resumeText) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: 'assistant',
            content:
              "We received your file but couldn't extract the text from it (this can happen with scanned PDFs or some file types). Please paste your resume in the message box below so we can continue with your application.",
          },
        ]);
      }

      // If we have extracted text, call the chat API so the agent can summarize and use it (last message is the upload message)
      if (data.resumeText) {
        setIsLoading(true);
        const assistantId = crypto.randomUUID();
        setMessages((prev) => [
          ...prev,
          { id: assistantId, role: 'assistant', content: '' },
        ]);
        try {
          const bodyMessages = [...messages, userMessage].map((m) => ({
            role: m.role,
            content: m.content,
          }));
          const chatRes = await fetch('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: bodyMessages,
              ...(jobId && { jobId }),
              resumeUrl: attachment.url,
              resumeFileKey: attachment.fileKey,
              resumeText: attachment.resumeText,
            }),
          });
          if (!chatRes.ok) {
            const errData = await chatRes.json().catch(() => ({}));
            throw new Error(errData.error ?? 'Failed to get response');
          }
          const reader = chatRes.body?.getReader();
          const decoder = new TextDecoder();
          let streamed = '';
          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              streamed += decoder.decode(value, { stream: true });
              setMessages((prev) =>
                prev.map((m) =>
                  m.id === assistantId ? { ...m, content: streamed } : m
                )
              );
            }
          }
        } catch (chatErr) {
          const msg =
            chatErr instanceof Error
              ? chatErr.message
              : 'Something went wrong. Please try again.';
          setMessages((prev) =>
            prev.map((m) =>
              m.id === assistantId ? { ...m, content: msg } : m
            )
          );
        } finally {
          setIsLoading(false);
        }
      }
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : 'Upload failed. Please log in or try pasting your resume.';
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          content: msg,
        },
      ]);
    } finally {
      setUploadingResume(false);
      e.target.value = '';
    }
  };

  return (
    <Card
      className={cn(
        'flex flex-col overflow-hidden border-2 border-blue-100 bg-white shadow-lg',
        expanded && 'min-h-0', // Allow shrinking when in flex container
        className
      )}
    >
      {!hideHeader && (
        <div className="flex items-center gap-2 border-b border-gray-200 bg-blue-50/80 px-4 py-3">
          <MessageCircle className="h-5 w-5 text-blue-600" />
          <span className="font-semibold text-gray-900">{headerTitle}</span>
        </div>
      )}

      <div className="flex flex-1 flex-col min-h-0 overflow-hidden">
        <div
          ref={messagesContainerRef}
          className="flex-1 min-h-0 overflow-y-auto p-4 space-y-4"
          style={{ maxHeight: `${maxMessagesHeight}px` }}
        >
          {messages.length === 0 && (
            <p className="text-center text-sm text-gray-500 py-6">
              Ask about open roles, get job details, or start an application.
            </p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={cn(
                'flex',
                msg.role === 'user' ? 'justify-end' : 'justify-start'
              )}
            >
              <div
                className={cn(
                  'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm',
                  msg.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                )}
              >
                {msg.role === 'assistant' && isLoading && !msg.content ? (
                  <span className="flex items-center gap-1.5 text-gray-500">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Thinking...
                  </span>
                ) : msg.role === 'assistant' ? (
                  <ChatMessageContent
                    content={msg.content}
                    linkifyPaths
                    className="text-[14px]"
                  />
                ) : (
                  <p className="whitespace-pre-wrap wrap-break-word">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          <div aria-hidden />
        </div>

        <div className="shrink-0 border-t border-gray-200 p-3 space-y-2">
          {!user && (
            <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-3 space-y-3">
              <p className="text-[13px] font-medium text-amber-900 flex items-center gap-2">
                <LogIn className="h-4 w-4 shrink-0" />
                Sign in to apply
              </p>
              {authStep === 'idle' && (
                <button
                  type="button"
                  onClick={() => setAuthStep('email')}
                  className="text-[13px] text-amber-800 underline hover:no-underline"
                >
                  Enter your email to sign in or create an account
                </button>
              )}
              {authStep === 'email' && (
                <div className="flex flex-col gap-2">
                  <Input
                    type="email"
                    placeholder="you@example.com"
                    value={authEmail}
                    onChange={(e) => { setAuthEmail(e.target.value); setAuthError(null); }}
                    className="h-9 text-[14px]"
                    disabled={authLoading}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleSendCode} disabled={authLoading} className="bg-amber-700 hover:bg-amber-800">
                      {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Send code'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setAuthStep('idle'); setAuthEmail(''); setAuthError(null); }}>
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
              {authStep === 'code' && (
                <div className="flex flex-col gap-2">
                  <p className="text-[12px] text-amber-800">We sent a 6-digit code to {authEmail}. Enter it below.</p>
                  <Input
                    type="text"
                    inputMode="numeric"
                    placeholder="000000"
                    maxLength={6}
                    value={authCode}
                    onChange={(e) => { setAuthCode(e.target.value.replace(/\D/g, '')); setAuthError(null); }}
                    className="h-9 text-[14px] font-mono tracking-widest"
                    disabled={authLoading}
                  />
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleVerifyCode} disabled={authLoading || authCode.length !== 6} className="bg-amber-700 hover:bg-amber-800">
                      {authLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Verify'}
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => { setAuthStep('email'); setAuthCode(''); setAuthError(null); }}>
                      Use different email
                    </Button>
                  </div>
                </div>
              )}
              {authError && <p className="text-[12px] text-red-600">{authError}</p>}
            </div>
          )}
          {resumeAttachment && (
            <div className="flex items-center gap-2 text-xs text-gray-600 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <FileText className="h-4 w-4 text-green-600 shrink-0" />
              <span className="truncate flex-1">{resumeAttachment.fileName}</span>
              <button
                type="button"
                onClick={() => setResumeAttachment(null)}
                className="text-gray-500 hover:text-gray-700 underline"
              >
                Remove
              </button>
            </div>
          )}
          <div className="flex gap-2 items-end">
            <Textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type your message or paste your resume here..."
              disabled={isLoading}
              className="min-h-[44px] max-h-[120px] resize-none flex-1 py-2"
              rows={2}
            />
            <div className="flex gap-1 shrink-0">
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                className="hidden"
                onChange={handleResumeUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="default"
                className="shrink-0"
                onClick={() => fileInputRef.current?.click()}
                disabled={isLoading || uploadingResume}
                title="Upload resume (PDF or DOCX)"
              >
                {uploadingResume ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Paperclip className="h-4 w-4" />
                )}
              </Button>
              <Button
                onClick={sendMessage}
                disabled={isLoading || !input.trim()}
                size="default"
                className="shrink-0"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <p className="text-xs text-gray-500">
            You can paste your resume in the box above or use the clip to upload a PDF/DOCX (requires login).
          </p>
        </div>
      </div>
    </Card>
  );
}
