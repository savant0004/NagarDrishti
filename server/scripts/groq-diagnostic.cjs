const fs = require('node:fs');
const path = require('node:path');
const dotenv = require('dotenv');
const Groq = require('groq-sdk').default || require('groq-sdk');

const envPath = path.resolve(__dirname, '../.env');
const inheritedKey = process.env.GROQ_API_KEY;
let fileContent = '';
let fileConfig = {};
try {
  fileContent = fs.readFileSync(envPath, 'utf8');
  fileConfig = dotenv.parse(fileContent);
} catch {
  // Report absence without printing filesystem errors or secret-bearing paths.
}

const sourceLine = fileContent.split(/\r?\n/).find((line) => /^\s*GROQ_API_KEY\s*=/.test(line));
const rawAssignment = sourceLine?.slice(sourceLine.indexOf('=') + 1) ?? '';
const trimmedAssignment = rawAssignment.trim();
const fileKey = typeof fileConfig.GROQ_API_KEY === 'string' ? fileConfig.GROQ_API_KEY.trim() : '';
// Match backend dotenv precedence: inherited environment variables take precedence over server/.env.
dotenv.config({ path: envPath, quiet: true });
const effectiveKey = process.env.GROQ_API_KEY?.trim() || '';
const model = process.env.GROQ_MODEL?.trim() || 'openai/gpt-oss-120b';
const visionModel = process.env.GROQ_VISION_MODEL?.trim() || 'qwen/qwen3.8-27b';
const groqNames = Object.keys(fileConfig).filter((name) => /^GROQ_/i.test(name));
const duplicateKeyLines = fileContent.split(/\r?\n/).filter((line) => /^\s*GROQ_API_KEY\s*=/.test(line)).length;
const wrappedInQuotes = /^(?:".*"|'.*')$/.test(trimmedAssignment);
const hasAssignmentWhitespace = rawAssignment !== rawAssignment.trim();
const parsedKeyHasWhitespace = /\s/.test(fileKey);
const staleProcessOverride = Boolean(inheritedKey && fileKey && inheritedKey.trim() !== fileKey);

function classifyStatus(status) {
  if (status === 401) return 'authentication_error';
  if (status === 403) return 'permission_error';
  if (status === 404) return 'model_error';
  if (status === 429) return 'rate_limited';
  return 'provider_error';
}

function reportFailure(step, error) {
  const status = Number.isInteger(error?.status) ? error.status : undefined;
  const classification = status ? classifyStatus(status) : /timeout|abort/i.test(`${error?.name || ''} ${error?.constructor?.name || ''}`) ? 'timeout' : 'network_error';
  const sanitizedError = status === 401 ? 'Groq rejected the configured credential (HTTP 401).' : status === 403
    ? 'Groq denied access to the account or requested resource (HTTP 403).' : status === 404
      ? 'Groq could not find the requested model or resource (HTTP 404).' : status === 429
        ? 'Groq rate limit reached (HTTP 429).' : classification === 'timeout'
          ? 'Groq request timed out.' : 'Groq request failed; provider response details were suppressed.';
  console.log(JSON.stringify({ step, ok: false, classification, ...(status ? { httpStatus: status } : {}), sanitizedError }));
}

async function main() {
  console.log(JSON.stringify({
    envFile: 'server/.env',
    envFileFound: fs.existsSync(envPath),
    dotenvKeyParsed: Boolean(fileKey),
    effectiveKeyPresent: Boolean(effectiveKey),
    effectiveKeySource: inheritedKey ? 'process_environment' : fileKey ? 'server/.env' : 'missing',
    inheritedKeyDiffersFromFile: staleProcessOverride,
    envVariableNames: groqNames,
    duplicateKeyAssignments: duplicateKeyLines,
    wrappedInQuotes: wrappedInQuotes,
    assignmentHasOuterWhitespace: hasAssignmentWhitespace,
    parsedKeyHasWhitespace: parsedKeyHasWhitespace,
    textModel: model,
    visionModel,
    sdkAuth: 'official SDK Bearer authentication',
  }));

  if (!effectiveKey) {
    console.log(JSON.stringify({ step: 'configuration', ok: false, classification: 'missing_credential', sanitizedError: 'GROQ_API_KEY is missing from the backend environment.' }));
    process.exitCode = 1;
    return;
  }

  const groq = new Groq({ apiKey: effectiveKey, timeout: 15_000, maxRetries: 0, logLevel: 'error' });
  let models;
  try {
    models = await groq.models.list();
    console.log(JSON.stringify({ step: 'models', ok: true, availableModelCount: models.data.length }));
  } catch (error) {
    reportFailure('models', error);
    process.exitCode = 1;
    return;
  }

  const availableModels = new Set(models.data.map((item) => item.id));
  if (!availableModels.has(model)) {
    console.log(JSON.stringify({ step: 'chat', ok: false, classification: 'model_error', sanitizedError: `Configured text model is not available to this API key: ${model}.` }));
    process.exitCode = 1;
    return;
  }

  try {
    const completion = await groq.chat.completions.create({
      model,
      messages: [{ role: 'user', content: 'Reply with exactly GROQ_OK.' }],
      max_completion_tokens: 16,
      stream: false,
    });
    const content = completion.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) {
      console.log(JSON.stringify({ step: 'chat', ok: false, classification: 'invalid_response', sanitizedError: 'Groq returned an empty completion.' }));
      process.exitCode = 1;
      return;
    }
    console.log(JSON.stringify({ step: 'chat', ok: true, model: completion.model, nonEmptyResponse: true }));
  } catch (error) {
    reportFailure('chat', error);
    process.exitCode = 1;
  }
}

main().catch(() => {
  console.log(JSON.stringify({ step: 'diagnostic', ok: false, classification: 'diagnostic_error', sanitizedError: 'The Groq diagnostic could not complete.' }));
  process.exitCode = 1;
});
