import path from 'path';
import { defineConfig, loadEnv } from 'vite';


export default defineConfig(({ mode }) => {
    const env = loadEnv(mode, '.', '');
    return {
      server: {
        port: 5000,
        host: '0.0.0.0',
        allowedHosts: true,
        hmr: {
          clientPort: 443,
        },
        proxy: {
          '/api': {
            target: 'http://localhost:3001',
            changeOrigin: true,
          },
        },
      },
      plugins: [],
      resolve: {
        alias: {
          '@': path.resolve(__dirname, '.'),
        }
      },
      worker: {
        format: 'es',
      },
    };
});
