import { createHash } from 'crypto';
import { IssueSeverity, IssueType } from '../models/Issue';

export type AICategory = IssueType | 'Other Urban Infrastructure' | 'No Identifiable Urban Issue';
export interface AIVisionResult {
  detected: boolean;
  category: AICategory;
  description: string;
  severity: IssueSeverity;
  severityExplanation: string;
  confidence: number;
  evidence: string[];
  recommendedAction: string;
  requiresHumanReview: boolean;
  provider: 'Groq';
  modelIdentifier: string;
  analyzedAt: Date;
}

export class VisionAnalysisError extends Error {
  constructor(
    public readonly kind: 'not_configured' | 'provider_unavailable' | 'invalid_response' | 'invalid_image' | 'rate_limited' | 'provider_rejected' | 'timeout',
    message: string,
    public readonly providerStatus?: number,
  ) {
    super(message);
    this.name = 'VisionAnalysisError';
  }
}

const DEFAULT_MODEL_ID = 'qwen/qwen3.8-27b';
const categories: AICategory[] = [
  'Pothole', 'Garbage Accumulation', 'Waterlogging', 'Blocked Drainage', 'Road Damage',
  'Broken Streetlight', 'Water Leakage', 'Other Urban Infrastructure', 'No Identifiable Urban Issue',
  'Traffic Congestion', 'Damaged Sidewalk', 'Road Obstruction',
];
const severities: IssueSeverity[] = ['Critical', 'High', 'Medium', 'Low'];
const analysisCache = new Map<string, { expiresAt: number; result: AIVisionResult }>();
const CACHE_LIMIT = 128;
const CACHE_TTL_MS = 30 * 60 * 1000;
const GROQ_CHAT_COMPLETIONS_URL = 'https://api.groq.com/openai/v1/chat/completions';

export function validateImageContent(buffer: Buffer, mimeType: string): void {
  const signatures: Record<string, (data: Buffer) => boolean> = {
    'image/jpeg': (data) => data.length >= 3 && data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff,
    'image/png': (data) => data.length >= 8 && data.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])),
    'image/webp': (data) => data.length >= 12 && data.toString('ascii', 0, 4) === 'RIFF' && data.toString('ascii', 8, 12) === 'WEBP',
  };
  if (!signatures[mimeType] || !signatures[mimeType](buffer)) {
    throw new VisionAnalysisError('invalid_image', 'Upload must be a valid JPEG, PNG, or WEBP image.');
  }
}

function cacheKey(buffer: Buffer, mimeType: string): string {
  return createHash('sha256').update(mimeType).update(buffer).digest('hex');
}

function validateModelPayload(value: unknown): Omit<AIVisionResult, 'provider' | 'modelIdentifier' | 'analyzedAt'> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Expected a JSON object');
  const data = value as Record<string, unknown>;
  if (typeof data.detected !== 'boolean' || !categories.includes(data.category as AICategory)) throw new Error('Invalid detection or category');
  if (typeof data.description !== 'string' || data.description.length < 3 || data.description.length > 1000) throw new Error('Invalid description');
  if (!severities.includes(data.severity as IssueSeverity)) throw new Error('Invalid severity');
  if (typeof data.severityExplanation !== 'string' || data.severityExplanation.length < 3 || data.severityExplanation.length > 1000) throw new Error('Invalid severity explanation');
  if (typeof data.confidence !== 'number' || !Number.isFinite(data.confidence) || data.confidence < 0 || data.confidence > 1) throw new Error('Invalid confidence');
  if (!Array.isArray(data.evidence) || data.evidence.length > 8 || !data.evidence.every((item) => typeof item === 'string' && item.length <= 300)) throw new Error('Invalid evidence');
  if (typeof data.recommendedAction !== 'string' || data.recommendedAction.length < 3 || data.recommendedAction.length > 1000) throw new Error('Invalid recommended action');
  if (typeof data.requiresHumanReview !== 'boolean') throw new Error('Invalid human review status');
  if (!data.detected && data.category !== 'No Identifiable Urban Issue') throw new Error('No-issue result has an issue category');
  if (data.detected && data.category === 'No Identifiable Urban Issue') throw new Error('Detected result has no-issue category');
  return {
    detected: data.detected,
    category: data.category as AICategory,
    description: data.description,
    severity: data.severity as IssueSeverity,
    severityExplanation: data.severityExplanation,
    confidence: data.confidence,
    evidence: data.evidence as string[],
    recommendedAction: data.recommendedAction,
    requiresHumanReview: data.requiresHumanReview || !data.detected || data.confidence < 0.55,
  };
}

export function getCachedImageAnalysis(buffer: Buffer, mimeType: string): AIVisionResult | undefined {
  const entry = analysisCache.get(cacheKey(buffer, mimeType));
  if (!entry) return undefined;
  if (entry.expiresAt <= Date.now()) { analysisCache.delete(cacheKey(buffer, mimeType)); return undefined; }
  return entry.result;
}

function providerError(status: number): VisionAnalysisError {
  if (status === 401 || status === 403) {
    return new VisionAnalysisError('provider_rejected', `Image analysis credentials were rejected by Groq (HTTP ${status}). You can still submit the report manually.`, status);
  }
  if (status === 429) return new VisionAnalysisError('rate_limited', 'Image analysis is temporarily rate limited. You can still submit the report manually.', status);
  if (status >= 500) return new VisionAnalysisError('provider_unavailable', 'Groq image analysis is temporarily unavailable. You can still submit the report manually.', status);
  return new VisionAnalysisError('provider_unavailable', 'Groq could not process this image request. You can still submit the report manually.', status);
}

export async function analyzeUploadedImage(buffer: Buffer, mimeType: string): Promise<AIVisionResult> {
  if (!Buffer.isBuffer(buffer) || buffer.length === 0) throw new VisionAnalysisError('invalid_image', 'An image is required for analysis.');
  validateImageContent(buffer, mimeType);
  const cached = getCachedImageAnalysis(buffer, mimeType);
  if (cached) return cached;

  const apiKey = process.env.GROQ_API_KEY?.trim();
  if (!apiKey) throw new VisionAnalysisError('not_configured', 'Groq image analysis is not configured. You can still submit a manually categorized report.');

  const modelIdentifier = process.env.GROQ_MODEL?.trim() || DEFAULT_MODEL_ID;
  let response: Response;
  try {
    response = await fetch(GROQ_CHAT_COMPLETIONS_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(30_000),
      body: JSON.stringify({
        model: modelIdentifier,
        messages: [{
          role: 'user',
          content: [
            { type: 'text', text: 'Analyze the actual uploaded image for a visible urban infrastructure issue. Return only a JSON object with keys detected (boolean), category, description, severity, severityExplanation, confidence (0 to 1), evidence (array of strings), recommendedAction, requiresHumanReview (boolean). Allowed category strings exactly: Pothole, Garbage Accumulation, Waterlogging, Blocked Drainage, Road Damage, Broken Streetlight, Water Leakage, Other Urban Infrastructure, No Identifiable Urban Issue. Existing categories such as Traffic Congestion, Damaged Sidewalk, or Road Obstruction may be used only when clearly visible. Distinguish potholes from other road damage and waterlogging from blocked drainage when evidence permits. If unrelated, unclear, or no issue is identifiable, set detected=false, category=No Identifiable Urban Issue, and requiresHumanReview=true. Estimate severity only from visible scale and condition; do not state definitive real-world public safety risk based on an image. Confidence must reflect visual classification uncertainty and must not be presented as certainty. Do not infer a category or evidence that is not visible.' },
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${buffer.toString('base64')}` } },
          ],
        }],
        response_format: { type: 'json_object' },
        temperature: 0.1,
        max_completion_tokens: 900,
        reasoning_effort: 'none',
      }),
    });
  } catch (error: unknown) {
    const timedOut = error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError');
    console.error(`Groq image analysis request failed${timedOut ? ' (timeout)' : ' (network error)'}.`);
    throw new VisionAnalysisError(timedOut ? 'timeout' : 'provider_unavailable', timedOut
      ? 'Image analysis timed out. You can still submit the report manually.'
      : 'Groq image analysis is temporarily unavailable. You can still submit the report manually.');
  }

  if (!response.ok) {
    console.error(`Groq image analysis request failed (HTTP ${response.status}).`);
    throw providerError(response.status);
  }

  try {
    const payload: unknown = await response.json();
    if (!payload || typeof payload !== 'object') throw new Error('Invalid completion response');
    const choices = (payload as { choices?: unknown }).choices;
    if (!Array.isArray(choices) || !choices[0] || typeof choices[0] !== 'object') throw new Error('Missing completion choice');
    const message = (choices[0] as { message?: unknown }).message;
    if (!message || typeof message !== 'object' || typeof (message as { content?: unknown }).content !== 'string') throw new Error('Missing JSON content');
    const parsed: unknown = JSON.parse((message as { content: string }).content);
    const validated = validateModelPayload(parsed);
    const result: AIVisionResult = { ...validated, provider: 'Groq', modelIdentifier, analyzedAt: new Date() };
    const key = cacheKey(buffer, mimeType);
    if (analysisCache.size >= CACHE_LIMIT) analysisCache.delete(analysisCache.keys().next().value!);
    analysisCache.set(key, { expiresAt: Date.now() + CACHE_TTL_MS, result });
    return result;
  } catch {
    throw new VisionAnalysisError('invalid_response', 'Groq returned an unusable image analysis result. Please categorize the report manually.');
  }
}
