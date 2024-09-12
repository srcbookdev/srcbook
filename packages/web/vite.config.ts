import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import chokidar from 'chokidar';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'backend-watch-reload',
      configureServer(server) {
        const watcher = chokidar.watch('../api/**/*.mts', {
          ignored: /node_modules/,
          persistent: true,
        });
        watcher.on('change', (path) => {
          console.log(`Backend file ${path} changed. Reloading frontend...`);
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
