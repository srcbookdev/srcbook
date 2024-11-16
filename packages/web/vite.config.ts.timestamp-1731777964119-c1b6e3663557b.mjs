// vite.config.ts
import path from "path";
import { defineConfig } from "file:///mnt/d/srcbook/node_modules/.pnpm/vite@5.4.4_@types+node@22.5.4/node_modules/vite/dist/node/index.js";
import react from "file:///mnt/d/srcbook/node_modules/.pnpm/@vitejs+plugin-react-swc@3.7.0_vite@5.4.4_@types+node@22.5.4_/node_modules/@vitejs/plugin-react-swc/index.mjs";
import chokidar from "file:///mnt/d/srcbook/node_modules/.pnpm/chokidar@4.0.1/node_modules/chokidar/esm/index.js";
var __vite_injected_original_dirname = "/mnt/d/srcbook/packages/web";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    // reload on backend change
    {
      name: "backend-watch-reload",
      configureServer(server) {
        const watcher = chokidar.watch("../api", {
          persistent: true,
          ignored: (file, stats) => !!stats?.isFile() && !file.endsWith(".mts")
        });
        watcher.on("change", () => {
          server.ws.send({
            type: "full-reload"
          });
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__vite_injected_original_dirname, "./src")
    }
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvbW50L2Qvc3JjYm9vay9wYWNrYWdlcy93ZWJcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9tbnQvZC9zcmNib29rL3BhY2thZ2VzL3dlYi92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vbW50L2Qvc3JjYm9vay9wYWNrYWdlcy93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcclxuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZSc7XHJcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xyXG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xyXG5cclxuLy8gaHR0cHM6Ly92aXRlanMuZGV2L2NvbmZpZy9cclxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcclxuICBwbHVnaW5zOiBbXHJcbiAgICByZWFjdCgpLFxyXG4gICAgLy8gcmVsb2FkIG9uIGJhY2tlbmQgY2hhbmdlXHJcbiAgICB7XHJcbiAgICAgIG5hbWU6ICdiYWNrZW5kLXdhdGNoLXJlbG9hZCcsXHJcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcclxuICAgICAgICBjb25zdCB3YXRjaGVyID0gY2hva2lkYXIud2F0Y2goJy4uL2FwaScsIHtcclxuICAgICAgICAgIHBlcnNpc3RlbnQ6IHRydWUsXHJcbiAgICAgICAgICBpZ25vcmVkOiAoZmlsZSwgc3RhdHMpID0+ICEhc3RhdHM/LmlzRmlsZSgpICYmICFmaWxlLmVuZHNXaXRoKCcubXRzJyksXHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgd2F0Y2hlci5vbignY2hhbmdlJywgKCkgPT4ge1xyXG4gICAgICAgICAgc2VydmVyLndzLnNlbmQoe1xyXG4gICAgICAgICAgICB0eXBlOiAnZnVsbC1yZWxvYWQnLFxyXG4gICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgIH0sXHJcbiAgICB9LFxyXG4gIF0sXHJcblxyXG4gIHJlc29sdmU6IHtcclxuICAgIGFsaWFzOiB7XHJcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXHJcbiAgICB9LFxyXG4gIH0sXHJcbn0pO1xyXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQW1RLE9BQU8sVUFBVTtBQUNwUixTQUFTLG9CQUFvQjtBQUM3QixPQUFPLFdBQVc7QUFDbEIsT0FBTyxjQUFjO0FBSHJCLElBQU0sbUNBQW1DO0FBTXpDLElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVM7QUFBQSxJQUNQLE1BQU07QUFBQTtBQUFBLElBRU47QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFRO0FBQ3RCLGNBQU0sVUFBVSxTQUFTLE1BQU0sVUFBVTtBQUFBLFVBQ3ZDLFlBQVk7QUFBQSxVQUNaLFNBQVMsQ0FBQyxNQUFNLFVBQVUsQ0FBQyxDQUFDLE9BQU8sT0FBTyxLQUFLLENBQUMsS0FBSyxTQUFTLE1BQU07QUFBQSxRQUN0RSxDQUFDO0FBQ0QsZ0JBQVEsR0FBRyxVQUFVLE1BQU07QUFDekIsaUJBQU8sR0FBRyxLQUFLO0FBQUEsWUFDYixNQUFNO0FBQUEsVUFDUixDQUFDO0FBQUEsUUFDSCxDQUFDO0FBQUEsTUFDSDtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFFQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLEtBQUssUUFBUSxrQ0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
