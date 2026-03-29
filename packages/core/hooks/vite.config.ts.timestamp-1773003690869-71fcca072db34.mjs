// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.10/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@22.19.10_/node_modules/@vitejs/plugin-react/dist/index.js";
import dts from "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/node_modules/.pnpm/vite-plugin-dts@4.5.4_@types+node@22.19.10_rollup@4.57.1_typescript@5.8.3_vite@5.4.21_@types+node@22.19.10_/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/monorepo/tree/story/WINT-4040/packages/core/hooks/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
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
          useLocalStorage: path.resolve(__dirname, "src/useLocalStorage.ts"),
          useUnsavedChangesPrompt: path.resolve(__dirname, "src/useUnsavedChangesPrompt.ts"),
          useDelayedShow: path.resolve(__dirname, "src/useDelayedShow.ts"),
          useMultiSelect: path.resolve(__dirname, "src/useMultiSelect.ts")
        },
        formats: ["es"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: ["react", "react-dom", /^@repo\/.*/, "@tanstack/react-router", "zod"],
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
          globals: {
            react: "React",
            "react-dom": "ReactDOM"
          }
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9tb25vcmVwby90cmVlL3N0b3J5L1dJTlQtNDA0MC9wYWNrYWdlcy9jb3JlL2hvb2tzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9tb25vcmVwby90cmVlL3N0b3J5L1dJTlQtNDA0MC9wYWNrYWdlcy9jb3JlL2hvb2tzL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L21vbm9yZXBvL3RyZWUvc3RvcnkvV0lOVC00MDQwL3BhY2thZ2VzL2NvcmUvaG9va3Mvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cydcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSlcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICBkdHMoe1xuICAgICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgICBleGNsdWRlOiBbJyoqLyoudGVzdC50cycsICcqKi8qLnRlc3QudHN4JywgJ3NyYy9fX3Rlc3RzX18vKionXSxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiB7XG4gICAgICAgICAgdXNlTG9jYWxTdG9yYWdlOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VzZUxvY2FsU3RvcmFnZS50cycpLFxuICAgICAgICAgIHVzZVVuc2F2ZWRDaGFuZ2VzUHJvbXB0OiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL3VzZVVuc2F2ZWRDaGFuZ2VzUHJvbXB0LnRzJyksXG4gICAgICAgICAgdXNlRGVsYXllZFNob3c6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdXNlRGVsYXllZFNob3cudHMnKSxcbiAgICAgICAgICB1c2VNdWx0aVNlbGVjdDogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy91c2VNdWx0aVNlbGVjdC50cycpLFxuICAgICAgICB9LFxuICAgICAgICBmb3JtYXRzOiBbJ2VzJ10sXG4gICAgICB9LFxuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsIC9eQHJlcG9cXC8uKi8sICdAdGFuc3RhY2svcmVhY3Qtcm91dGVyJywgJ3pvZCddLFxuICAgICAgICBvdXRwdXQ6IHtcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxuICAgICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICAgIHJlYWN0OiAnUmVhY3QnLFxuICAgICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fREVWX186IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBd2EsT0FBTyxVQUFVO0FBQ3piLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFKNFAsSUFBTSwyQ0FBMkM7QUFNN1QsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sSUFBSTtBQUFBLFFBQ0Ysa0JBQWtCO0FBQUEsUUFDbEIsU0FBUyxDQUFDLGdCQUFnQixpQkFBaUIsa0JBQWtCO0FBQUEsTUFDL0QsQ0FBQztBQUFBLElBQ0g7QUFBQSxJQUNBLFNBQVM7QUFBQSxNQUNQLE9BQU87QUFBQSxRQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLE1BQ3RDO0FBQUEsSUFDRjtBQUFBLElBQ0EsT0FBTztBQUFBLE1BQ0wsS0FBSztBQUFBLFFBQ0gsT0FBTztBQUFBLFVBQ0wsaUJBQWlCLEtBQUssUUFBUSxXQUFXLHdCQUF3QjtBQUFBLFVBQ2pFLHlCQUF5QixLQUFLLFFBQVEsV0FBVyxnQ0FBZ0M7QUFBQSxVQUNqRixnQkFBZ0IsS0FBSyxRQUFRLFdBQVcsdUJBQXVCO0FBQUEsVUFDL0QsZ0JBQWdCLEtBQUssUUFBUSxXQUFXLHVCQUF1QjtBQUFBLFFBQ2pFO0FBQUEsUUFDQSxTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXLFNBQVM7QUFBQSxNQUNwQixlQUFlO0FBQUEsUUFDYixVQUFVLENBQUMsU0FBUyxhQUFhLGNBQWMsMEJBQTBCLEtBQUs7QUFBQSxRQUM5RSxRQUFRO0FBQUEsVUFDTixnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxVQUNoQixTQUFTO0FBQUEsWUFDUCxPQUFPO0FBQUEsWUFDUCxhQUFhO0FBQUEsVUFDZjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sU0FBUyxTQUFTO0FBQUEsSUFDcEI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
