import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
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
