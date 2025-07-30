// vite.config.ts
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@tailwindcss+vite@4.1.11_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/features/FileUpload/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Add workspace package aliases for better imports
        "@packages/ui": path.resolve(__dirname, "../../ui/src"),
        "@packages/auth": path.resolve(__dirname, "../../auth/src"),
        "@packages/shared": path.resolve(__dirname, "../../shared/src"),
        "@packages/wishlist": path.resolve(__dirname, "../../wishlist/src")
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "index.tsx"),
        name: "FileUpload",
        fileName: "index",
        formats: ["es", "cjs"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: ["react", "react-dom", "zod", "@packages/ui"],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            zod: "zod",
            "@packages/ui": "PackagesUI"
          }
        }
      }
    },
    define: {
      __DEV__: mode === "development"
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
      exclude: ["@packages/ui"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9mZWF0dXJlcy9GaWxlVXBsb2FkXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9mZWF0dXJlcy9GaWxlVXBsb2FkL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL3BhY2thZ2VzL2ZlYXR1cmVzL0ZpbGVVcGxvYWQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLy8gQWRkIHdvcmtzcGFjZSBwYWNrYWdlIGFsaWFzZXMgZm9yIGJldHRlciBpbXBvcnRzXG4gICAgICAgICdAcGFja2FnZXMvdWknOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vdWkvc3JjJyksXG4gICAgICAgICdAcGFja2FnZXMvYXV0aCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9hdXRoL3NyYycpLFxuICAgICAgICAnQHBhY2thZ2VzL3NoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi9zaGFyZWQvc3JjJyksXG4gICAgICAgICdAcGFja2FnZXMvd2lzaGxpc3QnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vd2lzaGxpc3Qvc3JjJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIGxpYjoge1xuICAgICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2luZGV4LnRzeCcpLFxuICAgICAgICBuYW1lOiAnRmlsZVVwbG9hZCcsXG4gICAgICAgIGZpbGVOYW1lOiAnaW5kZXgnLFxuICAgICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLFxuICAgICAgfSxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgc291cmNlbWFwOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogWydyZWFjdCcsICdyZWFjdC1kb20nLCAnem9kJywgJ0BwYWNrYWdlcy91aSddLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgICByZWFjdDogJ1JlYWN0JyxcbiAgICAgICAgICAgICdyZWFjdC1kb20nOiAnUmVhY3RET00nLFxuICAgICAgICAgICAgem9kOiAnem9kJyxcbiAgICAgICAgICAgICdAcGFja2FnZXMvdWknOiAnUGFja2FnZXNVSScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fREVWX186IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgfSxcbiAgICBvcHRpbWl6ZURlcHM6IHtcbiAgICAgIGluY2x1ZGU6IFsncmVhY3QnLCAncmVhY3QtZG9tJ10sXG4gICAgICBleGNsdWRlOiBbJ0BwYWNrYWdlcy91aSddLFxuICAgIH0sXG4gIH07XG59KTsgIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFvWSxTQUFTLG9CQUFvQjtBQUNqYSxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8saUJBQWlCO0FBSjROLElBQU0sMkNBQTJDO0FBTXJTLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRTdELElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUEsSUFDaEMsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxPQUFPO0FBQUE7QUFBQSxRQUVwQyxnQkFBZ0IsS0FBSyxRQUFRLFdBQVcsY0FBYztBQUFBLFFBQ3RELGtCQUFrQixLQUFLLFFBQVEsV0FBVyxnQkFBZ0I7QUFBQSxRQUMxRCxvQkFBb0IsS0FBSyxRQUFRLFdBQVcsa0JBQWtCO0FBQUEsUUFDOUQsc0JBQXNCLEtBQUssUUFBUSxXQUFXLG9CQUFvQjtBQUFBLE1BQ3BFO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBLFFBQ0gsT0FBTyxLQUFLLFFBQVEsV0FBVyxXQUFXO0FBQUEsUUFDMUMsTUFBTTtBQUFBLFFBQ04sVUFBVTtBQUFBLFFBQ1YsU0FBUyxDQUFDLE1BQU0sS0FBSztBQUFBLE1BQ3ZCO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXLFNBQVM7QUFBQSxNQUNwQixlQUFlO0FBQUEsUUFDYixVQUFVLENBQUMsU0FBUyxhQUFhLE9BQU8sY0FBYztBQUFBLFFBQ3RELFFBQVE7QUFBQSxVQUNOLFNBQVM7QUFBQSxZQUNQLE9BQU87QUFBQSxZQUNQLGFBQWE7QUFBQSxZQUNiLEtBQUs7QUFBQSxZQUNMLGdCQUFnQjtBQUFBLFVBQ2xCO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixTQUFTLFNBQVM7QUFBQSxJQUNwQjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFNBQVMsV0FBVztBQUFBLE1BQzlCLFNBQVMsQ0FBQyxjQUFjO0FBQUEsSUFDMUI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
