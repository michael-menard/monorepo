// vitest.config.ts
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vitest@3.2.4_@types+node@22.18.12_@vitest+ui@3.2.4_jsdom@26.1.0_canvas@3.2.0__lightningcss@1._apewkbcwfmhivt23upuf543nby/node_modules/vitest/dist/config.js";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/core/design-system/vitest.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vitest_config_default = defineConfig({
  test: {
    environment: "node",
    // Design system is mostly utilities, no DOM needed
    globals: true,
    testTimeout: 5e3,
    hookTimeout: 5e3,
    teardownTimeout: 5e3,
    coverage: {
      provider: "istanbul",
      reporter: ["text", "html", "lcov"],
      exclude: [
        "**/node_modules/**",
        "**/dist/**",
        "**/*.config.*",
        "**/test/**",
        "**/__tests__/**",
        "**/*.d.ts",
        "**/coverage/**"
      ],
      thresholds: {
        global: {
          branches: 80,
          functions: 80,
          lines: 80,
          statements: 80
        }
      }
    }
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL3BhY2thZ2VzL2NvcmUvZGVzaWduLXN5c3RlbVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvTW9ub3JlcG8vcGFja2FnZXMvY29yZS9kZXNpZ24tc3lzdGVtL3ZpdGVzdC5jb25maWcudHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL21pY2hhZWxtZW5hcmQvRGV2ZWxvcG1lbnQvTW9ub3JlcG8vcGFja2FnZXMvY29yZS9kZXNpZ24tc3lzdGVtL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGVzdC9jb25maWcnXG5cbmNvbnN0IF9fZGlybmFtZSA9IHBhdGguZGlybmFtZShmaWxlVVJMVG9QYXRoKGltcG9ydC5tZXRhLnVybCkpXG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHRlc3Q6IHtcbiAgICBlbnZpcm9ubWVudDogJ25vZGUnLCAvLyBEZXNpZ24gc3lzdGVtIGlzIG1vc3RseSB1dGlsaXRpZXMsIG5vIERPTSBuZWVkZWRcbiAgICBnbG9iYWxzOiB0cnVlLFxuICAgIHRlc3RUaW1lb3V0OiA1MDAwLFxuICAgIGhvb2tUaW1lb3V0OiA1MDAwLFxuICAgIHRlYXJkb3duVGltZW91dDogNTAwMCxcbiAgICBjb3ZlcmFnZToge1xuICAgICAgcHJvdmlkZXI6ICdpc3RhbmJ1bCcsXG4gICAgICByZXBvcnRlcjogWyd0ZXh0JywgJ2h0bWwnLCAnbGNvdiddLFxuICAgICAgZXhjbHVkZTogW1xuICAgICAgICAnKiovbm9kZV9tb2R1bGVzLyoqJyxcbiAgICAgICAgJyoqL2Rpc3QvKionLFxuICAgICAgICAnKiovKi5jb25maWcuKicsXG4gICAgICAgICcqKi90ZXN0LyoqJyxcbiAgICAgICAgJyoqL19fdGVzdHNfXy8qKicsXG4gICAgICAgICcqKi8qLmQudHMnLFxuICAgICAgICAnKiovY292ZXJhZ2UvKionLFxuICAgICAgXSxcbiAgICAgIHRocmVzaG9sZHM6IHtcbiAgICAgICAgZ2xvYmFsOiB7XG4gICAgICAgICAgYnJhbmNoZXM6IDgwLFxuICAgICAgICAgIGZ1bmN0aW9uczogODAsXG4gICAgICAgICAgbGluZXM6IDgwLFxuICAgICAgICAgIHN0YXRlbWVudHM6IDgwLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgfSxcbiAgfSxcbn0pXG4iXSwKICAibWFwcGluZ3MiOiAiO0FBQXFZLE9BQU8sVUFBVTtBQUN0WixTQUFTLHFCQUFxQjtBQUM5QixTQUFTLG9CQUFvQjtBQUZ1TixJQUFNLDJDQUEyQztBQUlyUyxJQUFNLFlBQVksS0FBSyxRQUFRLGNBQWMsd0NBQWUsQ0FBQztBQUU3RCxJQUFPLHdCQUFRLGFBQWE7QUFBQSxFQUMxQixNQUFNO0FBQUEsSUFDSixhQUFhO0FBQUE7QUFBQSxJQUNiLFNBQVM7QUFBQSxJQUNULGFBQWE7QUFBQSxJQUNiLGFBQWE7QUFBQSxJQUNiLGlCQUFpQjtBQUFBLElBQ2pCLFVBQVU7QUFBQSxNQUNSLFVBQVU7QUFBQSxNQUNWLFVBQVUsQ0FBQyxRQUFRLFFBQVEsTUFBTTtBQUFBLE1BQ2pDLFNBQVM7QUFBQSxRQUNQO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsUUFDQTtBQUFBLFFBQ0E7QUFBQSxRQUNBO0FBQUEsTUFDRjtBQUFBLE1BQ0EsWUFBWTtBQUFBLFFBQ1YsUUFBUTtBQUFBLFVBQ04sVUFBVTtBQUFBLFVBQ1YsV0FBVztBQUFBLFVBQ1gsT0FBTztBQUFBLFVBQ1AsWUFBWTtBQUFBLFFBQ2Q7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLEVBQ0Y7QUFBQSxFQUNBLFNBQVM7QUFBQSxJQUNQLE9BQU87QUFBQSxNQUNMLEtBQUssS0FBSyxRQUFRLFdBQVcsT0FBTztBQUFBLElBQ3RDO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
