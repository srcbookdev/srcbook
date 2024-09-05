// vite.config.ts
import path from "path";
import { defineConfig } from "file:///Users/larryyu/Documents/workspace/personal/srcbook/node_modules/.pnpm/vite@5.2.12_@types+node@22.5.2/node_modules/vite/dist/node/index.js";
import react from "file:///Users/larryyu/Documents/workspace/personal/srcbook/node_modules/.pnpm/@vitejs+plugin-react-swc@3.7.0_vite@5.2.12_@types+node@22.5.2_/node_modules/@vitejs/plugin-react-swc/index.mjs";
import chokidar from "file:///Users/larryyu/Documents/workspace/personal/srcbook/node_modules/.pnpm/chokidar@3.6.0/node_modules/chokidar/index.js";
var __vite_injected_original_dirname = "/Users/larryyu/Documents/workspace/personal/srcbook/packages/web";
var vite_config_default = defineConfig({
  plugins: [
    react(),
    {
      name: "backend-watch-reload",
      configureServer(server) {
        const watcher = chokidar.watch("../api/**/*", {
          ignored: /node_modules/,
          // 忽略 node_modules 目录
          persistent: true
        });
        watcher.on("change", (path2) => {
          console.log(`Backend file ${path2} changed. Reloading frontend...`);
          setTimeout(() => {
            server.ws.send({
              type: "full-reload"
              // 发送完整的页面重载信号
            });
          }, 500);
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbGFycnl5dS9Eb2N1bWVudHMvd29ya3NwYWNlL3BlcnNvbmFsL3NyY2Jvb2svcGFja2FnZXMvd2ViXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbGFycnl5dS9Eb2N1bWVudHMvd29ya3NwYWNlL3BlcnNvbmFsL3NyY2Jvb2svcGFja2FnZXMvd2ViL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9sYXJyeXl1L0RvY3VtZW50cy93b3Jrc3BhY2UvcGVyc29uYWwvc3JjYm9vay9wYWNrYWdlcy93ZWIvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJztcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnO1xuaW1wb3J0IHJlYWN0IGZyb20gJ0B2aXRlanMvcGx1Z2luLXJlYWN0LXN3Yyc7XG5pbXBvcnQgY2hva2lkYXIgZnJvbSAnY2hva2lkYXInO1xuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgcGx1Z2luczogW1xuICAgIHJlYWN0KCksXG4gICAge1xuICAgICAgbmFtZTogJ2JhY2tlbmQtd2F0Y2gtcmVsb2FkJyxcbiAgICAgIGNvbmZpZ3VyZVNlcnZlcihzZXJ2ZXIpIHtcbiAgICAgICAgLy8gXHU3NkQxXHU1NDJDXHU1NDBFXHU3QUVGXHU2NTg3XHU0RUY2XHU1M0Q4XHU1MzE2XG4gICAgICAgIGNvbnN0IHdhdGNoZXIgPSBjaG9raWRhci53YXRjaCgnLi4vYXBpLyoqLyonLCB7XG4gICAgICAgICAgaWdub3JlZDogL25vZGVfbW9kdWxlcy8sIC8vIFx1NUZGRFx1NzU2NSBub2RlX21vZHVsZXMgXHU3NkVFXHU1RjU1XG4gICAgICAgICAgcGVyc2lzdGVudDogdHJ1ZSxcbiAgICAgICAgfSk7IC8vIFx1NTA0N1x1OEJCRVx1NTQwRVx1N0FFRlx1NEVFM1x1NzgwMVx1NTcyOCAuLi9iYWNrZW5kL3NyYyBcdTc2RUVcdTVGNTVcblxuICAgICAgICB3YXRjaGVyLm9uKCdjaGFuZ2UnLCAocGF0aCkgPT4ge1xuICAgICAgICAgIGNvbnNvbGUubG9nKGBCYWNrZW5kIGZpbGUgJHtwYXRofSBjaGFuZ2VkLiBSZWxvYWRpbmcgZnJvbnRlbmQuLi5gKTtcbiAgICAgICAgICAvLyBcdTg5RTZcdTUzRDEgVml0ZSBITVIgXHU2NkY0XHU2NUIwXG4gICAgICAgICAgc2V0VGltZW91dCgoKSA9PiB7XG4gICAgICAgICAgICBzZXJ2ZXIud3Muc2VuZCh7XG4gICAgICAgICAgICAgIHR5cGU6ICdmdWxsLXJlbG9hZCcsIC8vIFx1NTNEMVx1OTAwMVx1NUI4Q1x1NjU3NFx1NzY4NFx1OTg3NVx1OTc2Mlx1OTFDRFx1OEY3RFx1NEZFMVx1NTNGN1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgfSwgNTAwKTtcbiAgICAgICAgfSk7XG4gICAgICB9LFxuICAgIH0sXG4gIF0sXG5cbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgIH0sXG4gIH0sXG59KTtcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBa1gsT0FBTyxVQUFVO0FBQ25ZLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLGNBQWM7QUFIckIsSUFBTSxtQ0FBbUM7QUFNekMsSUFBTyxzQkFBUSxhQUFhO0FBQUEsRUFDMUIsU0FBUztBQUFBLElBQ1AsTUFBTTtBQUFBLElBQ047QUFBQSxNQUNFLE1BQU07QUFBQSxNQUNOLGdCQUFnQixRQUFRO0FBRXRCLGNBQU0sVUFBVSxTQUFTLE1BQU0sZUFBZTtBQUFBLFVBQzVDLFNBQVM7QUFBQTtBQUFBLFVBQ1QsWUFBWTtBQUFBLFFBQ2QsQ0FBQztBQUVELGdCQUFRLEdBQUcsVUFBVSxDQUFDQSxVQUFTO0FBQzdCLGtCQUFRLElBQUksZ0JBQWdCQSxLQUFJLGlDQUFpQztBQUVqRSxxQkFBVyxNQUFNO0FBQ2YsbUJBQU8sR0FBRyxLQUFLO0FBQUEsY0FDYixNQUFNO0FBQUE7QUFBQSxZQUNSLENBQUM7QUFBQSxVQUNILEdBQUcsR0FBRztBQUFBLFFBQ1IsQ0FBQztBQUFBLE1BQ0g7QUFBQSxJQUNGO0FBQUEsRUFDRjtBQUFBLEVBRUEsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbInBhdGgiXQp9Cg==
