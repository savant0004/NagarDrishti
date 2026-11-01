import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const configuredApiOrigin = env.VITE_API_URL?.trim().replace(/\/+$/, '');
  const configuredSocketOrigin = env.VITE_SOCKET_URL?.trim().replace(/\/+$/, '');
  if (mode === 'production' && !configuredApiOrigin) {
    console.warn('VITE_API_URL is unset; the production client will use same-origin /api and requires a reverse proxy.');
  }
  for (const [name, value] of [['VITE_API_URL', configuredApiOrigin], ['VITE_SOCKET_URL', configuredSocketOrigin]] as const) {
    if (!value || mode !== 'production') continue;
    try {
      const parsed = new URL(value);
      if (parsed.protocol !== 'https:' || parsed.origin !== value) throw new Error();
    } catch {
      throw new Error(`${name} must be an HTTPS origin without a path in production.`);
    }
  }
  const apiTarget = env.VITE_API_URL || 'http://localhost:5000';
  let socketTarget = env.VITE_SOCKET_URL || apiTarget;
  try { socketTarget = new URL(socketTarget, 'http://localhost:5000').origin; }
  catch { socketTarget = 'http://localhost:5000'; }

  return {
    plugins: [react()],
    server: {
      port: 5173,
      host: true,
      proxy: {
        '/api': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: apiTarget,
          changeOrigin: true,
        },
        '/socket.io': {
          target: socketTarget,
          changeOrigin: true,
          ws: true,
        },
      },
    },
  };
});
