import dotenv from 'dotenv';

dotenv.config();

export interface RuntimeConfig {
  port: number;
  nodeEnv: string;
  demoMode: boolean;
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
  const mongoUri = process.env.MONGODB_URI?.trim();
  if (!demoMode && !mongoUri) errors.push('MONGODB_URI is required when DEMO_MODE=false.');
  if (mongoUri && !/^mongodb(?:\+srv)?:\/\//i.test(mongoUri)) errors.push('MONGODB_URI must use the mongodb:// or mongodb+srv:// scheme.');
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret || Buffer.byteLength(jwtSecret, 'utf8') < 32) errors.push('JWT_SECRET must contain at least 32 bytes.');
  const port = Number(process.env.PORT || 5000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) errors.push('PORT must be a valid TCP port.');
  const clientOrigins = (process.env.CLIENT_URL || 'http://localhost:5173').split(',').map((origin) => origin.trim()).filter(Boolean);
  if (!clientOrigins.length) errors.push('CLIENT_URL must contain at least one allowed origin.');
  for (const origin of clientOrigins) {
    try {
      const parsed = new URL(origin);
      if (!['http:', 'https:'].includes(parsed.protocol) || parsed.origin !== origin.replace(/\/$/, '') || parsed.username || parsed.password) {
        errors.push('CLIENT_URL entries must be exact HTTP(S) origins without credentials, paths, or wildcards.');
        break;
      }
    } catch {
      errors.push('CLIENT_URL entries must be valid HTTP(S) origins.');
      break;
    }
  }
  return { port, nodeEnv: process.env.NODE_ENV || 'development', demoMode, mongoUri, jwtSecret, clientOrigins, errors };
}
