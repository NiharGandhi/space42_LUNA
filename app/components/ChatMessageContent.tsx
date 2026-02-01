'use client';

import Link from 'next/link';
import ReactMarkdown from 'react-markdown';
import type { Components } from 'react-markdown';

type ChatMessageContentProps = {
  content: string;
  /** When true, internal paths like /applications/xxx become clickable links */
  linkifyPaths?: boolean;
  /** Optional class for the wrapper (e.g. for user vs assistant bubble colors) */
  className?: string;
};

/**
 * Turns plain text paths like "View at /applications/abc-123" or "/career/abc-123" into markdown links
 * so they render as clickable. Only matches paths at start or after whitespace so we
 * don't double-wrap paths already inside markdown links like ](/applications/id).
 */
function linkifyInternalPaths(text: string): string {
  return text.replace(
    /(^|\s)(\/(?:applications|jobs|dashboard|settings\/onboarding|career)(?:\/[^\s)\]]*)?)/gim,
    (_, prefix, path) => `${prefix}[${path}](${path})`
  );
}

export function ChatMessageContent({
  content,
  linkifyPaths = true,
  className = '',
}: ChatMessageContentProps) {
  const text = linkifyPaths ? linkifyInternalPaths(content) : content;

  const components: Components = {
    a: ({ href, children, ...props }) => {
      const isInternal =
        typeof href === 'string' &&
        href.startsWith('/') &&
        !href.startsWith('//');
      if (isInternal && href) {
        return (
          <Link
            href={href}
            className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-slate-900 underline decoration-slate-400 underline-offset-2 hover:bg-slate-200/80 hover:decoration-slate-700"
            {...props}
          >
            {children}
          </Link>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 rounded px-2 py-0.5 font-medium text-blue-600 underline decoration-blue-300 underline-offset-2 hover:bg-blue-50 hover:decoration-blue-600"
          {...props}
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="my-2 list-disc space-y-1 pl-5 text-[14px]">{children}</ul>
    ),
    ol: ({ children }) => (
      <ol className="my-2 list-decimal space-y-1 pl-5 text-[14px]">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="pl-0.5 [&>p]:inline [&>p]:my-0">{children}</li>
    ),
    strong: ({ children }) => (
      <strong className="font-semibold text-inherit">{children}</strong>
    ),
    p: ({ children }) => <p className="my-1.5 first:mt-0 last:mb-0">{children}</p>,
    // Inline code for IDs (e.g. `abc-123`)
    code: ({ className: codeClassName, children, ...props }) => {
      const isBlock = codeClassName?.includes('language-');
      if (isBlock) {
        return (
          <code
            className="block overflow-x-auto rounded bg-slate-200/80 px-2 py-1.5 text-[13px]"
            {...props}
          >
            {children}
          </code>
        );
      }
      return (
        <code
          className="rounded bg-slate-200/70 px-1.5 py-0.5 font-mono text-[13px]"
          {...props}
        >
          {children}
        </code>
      );
    },
  };

  return (
    <div className={`text-[14px] **:wrap-break-word ${className}`}>
      <ReactMarkdown components={components}>{text}</ReactMarkdown>
    </div>
  );
}
