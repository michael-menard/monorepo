// vite.config.ts
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@tailwindcss+vite@4.1.11_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/features/wishlist/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Add workspace package aliases for better imports
        "@packages/ui": path.resolve(__dirname, "../ui/src"),
        "@packages/auth": path.resolve(__dirname, "../auth/src"),
        "@packages/shared": path.resolve(__dirname, "../shared/src"),
        "@packages/features": path.resolve(__dirname, "../features")
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "WishlistPackage",
        fileName: "index",
        formats: ["es", "cjs"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          "zod",
          "@packages/ui",
          "@packages/auth",
          "@packages/shared"
        ],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            zod: "zod"
          }
        }
      }
    },
    define: {
      __DEV__: mode === "development"
    },
    optimizeDeps: {
      include: ["react", "react-dom"],
      exclude: ["@packages/ui", "@packages/auth", "@packages/shared"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9mZWF0dXJlcy93aXNobGlzdFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvTW9ub3JlcG8vcGFja2FnZXMvZmVhdHVyZXMvd2lzaGxpc3Qvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvTW9ub3JlcG8vcGFja2FnZXMvZmVhdHVyZXMvd2lzaGxpc3Qvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKSwgdGFpbHdpbmRjc3MoKV0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLy8gQWRkIHdvcmtzcGFjZSBwYWNrYWdlIGFsaWFzZXMgZm9yIGJldHRlciBpbXBvcnRzXG4gICAgICAgICdAcGFja2FnZXMvdWknOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vdWkvc3JjJyksXG4gICAgICAgICdAcGFja2FnZXMvYXV0aCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9hdXRoL3NyYycpLFxuICAgICAgICAnQHBhY2thZ2VzL3NoYXJlZCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9zaGFyZWQvc3JjJyksXG4gICAgICAgICdAcGFja2FnZXMvZmVhdHVyZXMnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vZmVhdHVyZXMnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2luZGV4LnRzJyksXG4gICAgICAgIG5hbWU6ICdXaXNobGlzdFBhY2thZ2UnLFxuICAgICAgICBmaWxlTmFtZTogJ2luZGV4JyxcbiAgICAgICAgZm9ybWF0czogWydlcycsICdjanMnXSxcbiAgICAgIH0sXG4gICAgICBvdXREaXI6ICdkaXN0JyxcbiAgICAgIHNvdXJjZW1hcDogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgICAgZXh0ZXJuYWw6IFtcbiAgICAgICAgICAncmVhY3QnLFxuICAgICAgICAgICdyZWFjdC1kb20nLFxuICAgICAgICAgICd6b2QnLFxuICAgICAgICAgICdAcGFja2FnZXMvdWknLFxuICAgICAgICAgICdAcGFja2FnZXMvYXV0aCcsXG4gICAgICAgICAgJ0BwYWNrYWdlcy9zaGFyZWQnLFxuICAgICAgICBdLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgICByZWFjdDogJ1JlYWN0JyxcbiAgICAgICAgICAgICdyZWFjdC1kb20nOiAnUmVhY3RET00nLFxuICAgICAgICAgICAgem9kOiAnem9kJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICB9LFxuICAgIG9wdGltaXplRGVwczoge1xuICAgICAgaW5jbHVkZTogWydyZWFjdCcsICdyZWFjdC1kb20nXSxcbiAgICAgIGV4Y2x1ZGU6IFsnQHBhY2thZ2VzL3VpJywgJ0BwYWNrYWdlcy9hdXRoJywgJ0BwYWNrYWdlcy9zaGFyZWQnXSxcbiAgICB9LFxuICB9O1xufSk7ICJdLAogICJtYXBwaW5ncyI6ICI7QUFBOFgsU0FBUyxvQkFBb0I7QUFDM1osT0FBTyxXQUFXO0FBQ2xCLE9BQU8sVUFBVTtBQUNqQixTQUFTLHFCQUFxQjtBQUM5QixPQUFPLGlCQUFpQjtBQUp3TixJQUFNLDJDQUEyQztBQU1qUyxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUU3RCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxTQUFPO0FBQUEsSUFDTCxTQUFTLENBQUMsTUFBTSxHQUFHLFlBQVksQ0FBQztBQUFBLElBQ2hDLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBO0FBQUEsUUFFcEMsZ0JBQWdCLEtBQUssUUFBUSxXQUFXLFdBQVc7QUFBQSxRQUNuRCxrQkFBa0IsS0FBSyxRQUFRLFdBQVcsYUFBYTtBQUFBLFFBQ3ZELG9CQUFvQixLQUFLLFFBQVEsV0FBVyxlQUFlO0FBQUEsUUFDM0Qsc0JBQXNCLEtBQUssUUFBUSxXQUFXLGFBQWE7QUFBQSxNQUM3RDtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxRQUNILE9BQU8sS0FBSyxRQUFRLFdBQVcsY0FBYztBQUFBLFFBQzdDLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUN2QjtBQUFBLE1BQ0EsUUFBUTtBQUFBLE1BQ1IsV0FBVyxTQUFTO0FBQUEsTUFDcEIsZUFBZTtBQUFBLFFBQ2IsVUFBVTtBQUFBLFVBQ1I7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFFBQVE7QUFBQSxVQUNOLFNBQVM7QUFBQSxZQUNQLE9BQU87QUFBQSxZQUNQLGFBQWE7QUFBQSxZQUNiLEtBQUs7QUFBQSxVQUNQO0FBQUEsUUFDRjtBQUFBLE1BQ0Y7QUFBQSxJQUNGO0FBQUEsSUFDQSxRQUFRO0FBQUEsTUFDTixTQUFTLFNBQVM7QUFBQSxJQUNwQjtBQUFBLElBQ0EsY0FBYztBQUFBLE1BQ1osU0FBUyxDQUFDLFNBQVMsV0FBVztBQUFBLE1BQzlCLFNBQVMsQ0FBQyxnQkFBZ0Isa0JBQWtCLGtCQUFrQjtBQUFBLElBQ2hFO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
