// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.10/node_modules/vite/dist/node/index.js";
import dts from "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/node_modules/.pnpm/vite-plugin-dts@4.5.4_@types+node@22.19.10_rollup@4.57.1_typescript@5.8.3_vite@5.4.21_@types+node@22.19.10_/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/packages/core/auth-services/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [
      dts({
        insertTypesEntry: true,
        exclude: ["**/*.test.ts", "**/*.test.tsx", "src/__tests__/**"]
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    build: {
      lib: {
        entry: {
          index: path.resolve(__dirname, "src/index.ts")
        },
        formats: ["es"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: [/^@repo\/.*/, "zod"],
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js"
        }
      }
    },
    define: {
      __DEV__: mode === "development"
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9tb25vcmVwby90cmVlL3N0b3J5L1dJTlQtNDA0MC9wYWNrYWdlcy9jb3JlL2F1dGgtc2VydmljZXNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L21vbm9yZXBvL3RyZWUvc3RvcnkvV0lOVC00MDQwL3BhY2thZ2VzL2NvcmUvYXV0aC1zZXJ2aWNlcy92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9tb25vcmVwby90cmVlL3N0b3J5L1dJTlQtNDA0MC9wYWNrYWdlcy9jb3JlL2F1dGgtc2VydmljZXMvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cydcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSlcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIGR0cyh7XG4gICAgICAgIGluc2VydFR5cGVzRW50cnk6IHRydWUsXG4gICAgICAgIGV4Y2x1ZGU6IFsnKiovKi50ZXN0LnRzJywgJyoqLyoudGVzdC50c3gnLCAnc3JjL19fdGVzdHNfXy8qKiddLFxuICAgICAgfSksXG4gICAgXSxcbiAgICByZXNvbHZlOiB7XG4gICAgICBhbGlhczoge1xuICAgICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICBsaWI6IHtcbiAgICAgICAgZW50cnk6IHtcbiAgICAgICAgICBpbmRleDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpLFxuICAgICAgICB9LFxuICAgICAgICBmb3JtYXRzOiBbJ2VzJ10sXG4gICAgICB9LFxuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbL15AcmVwb1xcLy4qLywgJ3pvZCddLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICB9LFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFnYyxPQUFPLFVBQVU7QUFDamQsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxTQUFTO0FBSDRRLElBQU0sMkNBQTJDO0FBSzdVLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRTdELElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFNBQU87QUFBQSxJQUNMLFNBQVM7QUFBQSxNQUNQLElBQUk7QUFBQSxRQUNGLGtCQUFrQjtBQUFBLFFBQ2xCLFNBQVMsQ0FBQyxnQkFBZ0IsaUJBQWlCLGtCQUFrQjtBQUFBLE1BQy9ELENBQUM7QUFBQSxJQUNIO0FBQUEsSUFDQSxTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQSxNQUN0QztBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxRQUNILE9BQU87QUFBQSxVQUNMLE9BQU8sS0FBSyxRQUFRLFdBQVcsY0FBYztBQUFBLFFBQy9DO0FBQUEsUUFDQSxTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXLFNBQVM7QUFBQSxNQUNwQixlQUFlO0FBQUEsUUFDYixVQUFVLENBQUMsY0FBYyxLQUFLO0FBQUEsUUFDOUIsUUFBUTtBQUFBLFVBQ04sZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sU0FBUyxTQUFTO0FBQUEsSUFDcEI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
