// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/michaelmenard/Development/monorepo/node_modules/.pnpm/vite@5.4.21_@types+node@22.19.10/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/monorepo/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@22.19.10_/node_modules/@vitejs/plugin-react/dist/index.js";
import dts from "file:///Users/michaelmenard/Development/monorepo/node_modules/.pnpm/vite-plugin-dts@4.5.4_@types+node@22.19.10_rollup@4.57.1_typescript@5.8.3_vite@5.4.21_@types+node@22.19.10_/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/monorepo/packages/core/upload/vite.config.ts";
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
          index: path.resolve(__dirname, "src/index.ts"),
          "client/index": path.resolve(__dirname, "src/client/index.ts"),
          "hooks/index": path.resolve(__dirname, "src/hooks/index.ts"),
          "image/index": path.resolve(__dirname, "src/image/index.ts"),
          "image/presets/index": path.resolve(__dirname, "src/image/presets/index.ts"),
          "image/presets/__types__/index": path.resolve(
            __dirname,
            "src/image/presets/__types__/index.ts"
          ),
          "image/compression/index": path.resolve(__dirname, "src/image/compression/index.ts"),
          "image/compression/__types__/index": path.resolve(
            __dirname,
            "src/image/compression/__types__/index.ts"
          ),
          "image/heic/index": path.resolve(__dirname, "src/image/heic/index.ts"),
          "image/heic/__types__/index": path.resolve(
            __dirname,
            "src/image/heic/__types__/index.ts"
          ),
          "components/index": path.resolve(__dirname, "src/components/index.ts"),
          "types/index": path.resolve(__dirname, "src/types/index.ts")
        },
        formats: ["es"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          /^@repo\/.*/,
          "class-variance-authority",
          "clsx",
          "framer-motion",
          "tailwind-merge",
          "zod"
        ],
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9tb25vcmVwby9wYWNrYWdlcy9jb3JlL3VwbG9hZFwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvbW9ub3JlcG8vcGFja2FnZXMvY29yZS91cGxvYWQvdml0ZS5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvbW9ub3JlcG8vcGFja2FnZXMvY29yZS91cGxvYWQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cydcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSlcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICBkdHMoe1xuICAgICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgICBleGNsdWRlOiBbJyoqLyoudGVzdC50cycsICcqKi8qLnRlc3QudHN4JywgJ3NyYy9fX3Rlc3RzX18vKionXSxcbiAgICAgIH0pLFxuICAgIF0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBidWlsZDoge1xuICAgICAgbGliOiB7XG4gICAgICAgIGVudHJ5OiB7XG4gICAgICAgICAgaW5kZXg6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvaW5kZXgudHMnKSxcbiAgICAgICAgICAnY2xpZW50L2luZGV4JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9jbGllbnQvaW5kZXgudHMnKSxcbiAgICAgICAgICAnaG9va3MvaW5kZXgnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2hvb2tzL2luZGV4LnRzJyksXG4gICAgICAgICAgJ2ltYWdlL2luZGV4JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbWFnZS9pbmRleC50cycpLFxuICAgICAgICAgICdpbWFnZS9wcmVzZXRzL2luZGV4JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbWFnZS9wcmVzZXRzL2luZGV4LnRzJyksXG4gICAgICAgICAgJ2ltYWdlL3ByZXNldHMvX190eXBlc19fL2luZGV4JzogcGF0aC5yZXNvbHZlKFxuICAgICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICAgJ3NyYy9pbWFnZS9wcmVzZXRzL19fdHlwZXNfXy9pbmRleC50cycsXG4gICAgICAgICAgKSxcbiAgICAgICAgICAnaW1hZ2UvY29tcHJlc3Npb24vaW5kZXgnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnc3JjL2ltYWdlL2NvbXByZXNzaW9uL2luZGV4LnRzJyksXG4gICAgICAgICAgJ2ltYWdlL2NvbXByZXNzaW9uL19fdHlwZXNfXy9pbmRleCc6IHBhdGgucmVzb2x2ZShcbiAgICAgICAgICAgIF9fZGlybmFtZSxcbiAgICAgICAgICAgICdzcmMvaW1hZ2UvY29tcHJlc3Npb24vX190eXBlc19fL2luZGV4LnRzJyxcbiAgICAgICAgICApLFxuICAgICAgICAgICdpbWFnZS9oZWljL2luZGV4JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbWFnZS9oZWljL2luZGV4LnRzJyksXG4gICAgICAgICAgJ2ltYWdlL2hlaWMvX190eXBlc19fL2luZGV4JzogcGF0aC5yZXNvbHZlKFxuICAgICAgICAgICAgX19kaXJuYW1lLFxuICAgICAgICAgICAgJ3NyYy9pbWFnZS9oZWljL19fdHlwZXNfXy9pbmRleC50cycsXG4gICAgICAgICAgKSxcbiAgICAgICAgICAnY29tcG9uZW50cy9pbmRleCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvY29tcG9uZW50cy9pbmRleC50cycpLFxuICAgICAgICAgICd0eXBlcy9pbmRleCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICdzcmMvdHlwZXMvaW5kZXgudHMnKSxcbiAgICAgICAgfSxcbiAgICAgICAgZm9ybWF0czogWydlcyddLFxuICAgICAgfSxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgc291cmNlbWFwOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogW1xuICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAgICAgL15AcmVwb1xcLy4qLyxcbiAgICAgICAgICAnY2xhc3MtdmFyaWFuY2UtYXV0aG9yaXR5JyxcbiAgICAgICAgICAnY2xzeCcsXG4gICAgICAgICAgJ2ZyYW1lci1tb3Rpb24nLFxuICAgICAgICAgICd0YWlsd2luZC1tZXJnZScsXG4gICAgICAgICAgJ3pvZCcsXG4gICAgICAgIF0sXG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIGVudHJ5RmlsZU5hbWVzOiAnW25hbWVdLmpzJyxcbiAgICAgICAgICBjaHVua0ZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgZ2xvYmFsczoge1xuICAgICAgICAgICAgcmVhY3Q6ICdSZWFjdCcsXG4gICAgICAgICAgICAncmVhY3QtZG9tJzogJ1JlYWN0RE9NJyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICB9LFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE0VyxPQUFPLFVBQVU7QUFDN1gsU0FBUyxxQkFBcUI7QUFDOUIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxXQUFXO0FBQ2xCLE9BQU8sU0FBUztBQUpvTixJQUFNLDJDQUEyQztBQU1yUixJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUU3RCxJQUFPLHNCQUFRLGFBQWEsQ0FBQyxFQUFFLEtBQUssTUFBTTtBQUN4QyxTQUFPO0FBQUEsSUFDTCxTQUFTO0FBQUEsTUFDUCxNQUFNO0FBQUEsTUFDTixJQUFJO0FBQUEsUUFDRixrQkFBa0I7QUFBQSxRQUNsQixTQUFTLENBQUMsZ0JBQWdCLGlCQUFpQixrQkFBa0I7QUFBQSxNQUMvRCxDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsUUFDSCxPQUFPO0FBQUEsVUFDTCxPQUFPLEtBQUssUUFBUSxXQUFXLGNBQWM7QUFBQSxVQUM3QyxnQkFBZ0IsS0FBSyxRQUFRLFdBQVcscUJBQXFCO0FBQUEsVUFDN0QsZUFBZSxLQUFLLFFBQVEsV0FBVyxvQkFBb0I7QUFBQSxVQUMzRCxlQUFlLEtBQUssUUFBUSxXQUFXLG9CQUFvQjtBQUFBLFVBQzNELHVCQUF1QixLQUFLLFFBQVEsV0FBVyw0QkFBNEI7QUFBQSxVQUMzRSxpQ0FBaUMsS0FBSztBQUFBLFlBQ3BDO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxVQUNBLDJCQUEyQixLQUFLLFFBQVEsV0FBVyxnQ0FBZ0M7QUFBQSxVQUNuRixxQ0FBcUMsS0FBSztBQUFBLFlBQ3hDO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxVQUNBLG9CQUFvQixLQUFLLFFBQVEsV0FBVyx5QkFBeUI7QUFBQSxVQUNyRSw4QkFBOEIsS0FBSztBQUFBLFlBQ2pDO0FBQUEsWUFDQTtBQUFBLFVBQ0Y7QUFBQSxVQUNBLG9CQUFvQixLQUFLLFFBQVEsV0FBVyx5QkFBeUI7QUFBQSxVQUNyRSxlQUFlLEtBQUssUUFBUSxXQUFXLG9CQUFvQjtBQUFBLFFBQzdEO0FBQUEsUUFDQSxTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXLFNBQVM7QUFBQSxNQUNwQixlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxRQUNGO0FBQUEsUUFDQSxRQUFRO0FBQUEsVUFDTixnQkFBZ0I7QUFBQSxVQUNoQixnQkFBZ0I7QUFBQSxVQUNoQixTQUFTO0FBQUEsWUFDUCxPQUFPO0FBQUEsWUFDUCxhQUFhO0FBQUEsVUFDZjtBQUFBLFFBQ0Y7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsUUFBUTtBQUFBLE1BQ04sU0FBUyxTQUFTO0FBQUEsSUFDcEI7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
