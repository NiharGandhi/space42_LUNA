/**
 * Chat message sanitization for prompt-injection mitigation.
 * - Only allow 'user' and 'assistant' roles from the client (never trust client-supplied 'system').
 * - Enforce max length per message to limit injection blast radius.
 */

const DEFAULT_MAX_MESSAGE_LENGTH = 8_000;
const DEFAULT_MAX_MESSAGES = 50;

export type SanitizedMessage = {
  role: 'user' | 'assistant';
  content: string;
};

/**
 * Sanitize messages from the client before sending to the model.
 * - Drops any message with role 'system' (prevents client from injecting a fake system prompt).
 * - Normalizes role to 'user' or 'assistant' only; unknown roles are treated as 'user'.
 * - Truncates each message to maxLength characters.
 * - Ensures content is a non-null string.
 */
export function sanitizeChatMessages(
  messages: Array<{ role?: string; content?: unknown }>,
  options: {
    maxMessageLength?: number;
    maxMessages?: number;
  } = {}
): SanitizedMessage[] {
  const maxMessageLength = options.maxMessageLength ?? DEFAULT_MAX_MESSAGE_LENGTH;
  const maxMessages = options.maxMessages ?? DEFAULT_MAX_MESSAGES;

  const allowed: SanitizedMessage[] = [];
  for (const m of messages) {
    if (allowed.length >= maxMessages) break;

    const role = typeof m.role === 'string' ? m.role.toLowerCase() : '';
    if (role === 'system') continue;
    const normalizedRole: 'user' | 'assistant' = role === 'assistant' ? 'assistant' : 'user';

    let content: string;
    const raw = m.content;
    if (raw === null || raw === undefined) content = '';
    else if (typeof raw === 'string') content = raw;
    else content = String(raw);
    content = content.slice(0, maxMessageLength);

    allowed.push({ role: normalizedRole, content });
  }
  return allowed;
}
