import Groq from 'groq-sdk';

export const DEFAULT_GROQ_TEXT_MODEL = 'openai/gpt-oss-120b';
// The requested Llama text model does not accept images. Keep vision on a
// separately configurable multimodal model instead of sending an invalid call.
export const DEFAULT_GROQ_VISION_MODEL = 'qwen/qwen3.8-27b';

let cachedClient: Groq | undefined;
let cachedApiKey: string | undefined;

export function getGroqClient(): Groq {
  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new Error('GROQ_NOT_CONFIGURED');
  if (!cachedClient || cachedApiKey !== apiKey) {
    cachedClient = new Groq({ apiKey, timeout: 25_000, maxRetries: 0, logLevel: 'error', fetch: (...args) => globalThis.fetch(...args) });
    cachedApiKey = apiKey;
  }
  return cachedClient;
}

export function getGroqTextModel(): string {
  return process.env.GROQ_MODEL?.trim() || DEFAULT_GROQ_TEXT_MODEL;
}

export function getGroqVisionModel(): string {
  return process.env.GROQ_VISION_MODEL?.trim() || DEFAULT_GROQ_VISION_MODEL;
}

export function getGroqErrorStatus(error: unknown): number | undefined {
  const status = (error as { status?: unknown } | null)?.status;
  return typeof status === 'number' && Number.isInteger(status) ? status : undefined;
}

export function isGroqTimeout(error: unknown): boolean {
  const value = error as { name?: unknown; code?: unknown; cause?: unknown; constructor?: { name?: unknown } } | null;
  const isTimeout = (typeof value?.name === 'string' && /timeout|abort/i.test(value.name))
    || (typeof value?.constructor?.name === 'string' && /timeout|abort/i.test(value.constructor.name))
    || value?.code === 'ETIMEDOUT' || value?.code === 'ECONNABORTED';
  return isTimeout || (value?.cause != null && value.cause !== error && isGroqTimeout(value.cause));
}
