import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import chokidar from 'chokidar';
import { getViteEnvironment } from './src/lib/platform';

// https://vitejs.dev/config/
export default defineConfig({
  define: {
    'process.env.ROLLUP_NATIVE_PLATFORM': JSON.stringify(getViteEnvironment().rollupPlatform)
  },
  plugins: [
    react(),
    // reload on backend change
    {
      name: 'backend-watch-reload',
      configureServer(server) {
        const watcher = chokidar.watch('../api', {
          persistent: true,
          ignored: (file, stats) => !!stats?.isFile() && !file.endsWith('.mts'),
        });
        watcher.on('change', () => {
          server.ws.send({
            type: 'full-reload',
          });
        });
      },
    },
  ],

  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
