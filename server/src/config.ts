import dotenv from 'dotenv';
import path from 'path';

// Resolve from this module so `node server/dist/server.js` also loads server/.env
// when launched with the repository root as the current working directory.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export interface RuntimeConfig {
  port: number;
  nodeEnv: string;
  demoMode: boolean;
  mongoDatabaseMode: 'live' | 'demo';
  mongoDatabaseName: string;
  mongoUri?: string;
  jwtSecret?: string;
  clientOrigins: string[];
  errors: string[];
}

export function loadRuntimeConfig(): RuntimeConfig {
  const errors: string[] = [];
  const demoSetting = process.env.DEMO_MODE;
  if (demoSetting !== 'true' && demoSetting !== 'false') errors.push('DEMO_MODE must be explicitly set to true or false.');
  const demoMode = demoSetting === 'true';
  const mongoDatabaseSetting = process.env.MONGO_DATABASE_MODE || 'live';
  if (mongoDatabaseSetting !== 'live' && mongoDatabaseSetting !== 'demo') errors.push('MONGO_DATABASE_MODE must be live or demo.');
  const mongoDatabaseMode: 'live' | 'demo' = mongoDatabaseSetting === 'demo' ? 'demo' : 'live';
  const uriVariable = mongoDatabaseMode === 'demo' ? 'MONGO_DEMO_URI' : 'MONGODB_URI';
  const mongoUri = process.env[uriVariable]?.trim();
  if (!demoMode && !mongoUri) errors.push(`${uriVariable} is required when DEMO_MODE=false.`);
  if (mongoUri && !/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) errors.push(`${uriVariable} must use the mongodb:// or mongodb+srv:// scheme.`);
  if (mongoDatabaseMode === 'demo' && mongoUri) {
    try {
      if (new URL(mongoUri).pathname.replace(/^\//, '').split('/')[0] !== 'nagardrishti_demo') errors.push('MONGO_DEMO_URI must target nagardrishti_demo.');
    } catch {
      errors.push('MONGO_DEMO_URI must be a valid MongoDB connection URL.');
    }
  }
  let uriDatabaseName = '';
  if (mongoUri) {
    try { uriDatabaseName = new URL(mongoUri).pathname.replace(/^\//, '').split('/')[0]; }
    catch { /* Scheme validation above provides the configuration error. */ }
  }
  const mongoDatabaseName = mongoDatabaseMode === 'demo' ? 'nagardrishti_demo'
    : process.env.MONGODB_DATABASE?.trim() || uriDatabaseName || 'nagardrishti_demo';
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32 || /^(replace_with|your_|change_me|changeme)/i.test(jwtSecret)) {
    errors.push('JWT_SECRET must be a private, non-placeholder value of at least 32 bytes.');
  }
  const nodeEnv = process.env.NODE_ENV || 'development';
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be a valid TCP port.');
  const configuredClientUrl = process.env.CLIENT_URL?.trim();
  if (nodeEnv === 'production' && !configuredClientUrl) errors.push('CLIENT_URL must be set to the deployed frontend origin in production.');
  const clientOrigins = (configuredClientUrl || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!clientOrigins.length) errors.push('CLIENT_URL must contain at least one allowed origin.');
  for (const origin of clientOrigins) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin || parsed.username || parsed.password) {
        errors.push('CLIENT_URL entries must be exact HTTP(S) origins without credentials, paths, or wildcards.');
        break;
      }
      if (nodeEnv === 'production' && parsed.protocol !== 'https:') {
        errors.push('CLIENT_URL entries must use HTTPS in production.');
        break;
      }
    } catch {
      errors.push('CLIENT_URL entries must be valid HTTP(S) origins.');
      break;
    }
  }
  return { port, nodeEnv, demoMode, mongoDatabaseMode, mongoDatabaseName, mongoUri, jwtSecret, clientOrigins, errors };
}
