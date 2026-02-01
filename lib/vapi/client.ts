import { VapiClient } from '@vapi-ai/server-sdk';

let client: VapiClient | null = null;

export function getVapiClient(): VapiClient {
  const key = process.env.VAPI_API_KEY;
  if (!key) {
    throw new Error('VAPI_API_KEY is not set');
  }
  if (!client) {
    client = new VapiClient({ token: key });
  }
  return client;
}

export function getVapiPublicKey(): string {
  const key = process.env.VAPI_PUBLIC_KEY ?? process.env.NEXT_PUBLIC_VAPI_PUBLIC_KEY;
  if (!key) {
    throw new Error('VAPI_PUBLIC_KEY or NEXT_PUBLIC_VAPI_PUBLIC_KEY is not set');
  }
  return key;
}

export function getVapiWebhookBaseUrl(): string {
  const url = process.env.VAPI_WEBHOOK_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? process.env.VERCEL_URL;
  if (!url) {
    throw new Error('VAPI_WEBHOOK_URL or NEXT_PUBLIC_APP_URL or VERCEL_URL is not set');
  }
  const base = url.startsWith('http') ? url : `https://${url}`;
  return base.replace(/\/$/, '');
}
