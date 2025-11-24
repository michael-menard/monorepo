// vitest.config.ts
import { resolve } from "node:path";
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vitest@3.2.4_@types+node@24.9.1_@vitest+ui@3.2.4_jsdom@26.1.0_canvas@3.2.0__lightningcss@1.30_wy3dlfj3h3uwunvyb5ukyt635i/node_modules/vitest/dist/config.js";
var __vite_injected_original_dirname = "/Users/michaelmenard/Development/Monorepo/apps/web/lego-moc-instructions-app";
var vitest_config_default = defineConfig({
  test: {
    globals: true,
    environment: "jsdom",
    setupFiles: ["./src/__tests__/setup.ts"],
    // Memory management
    pool: "forks",
    poolOptions: {
      forks: {
        singleFork: true
        // Run tests in single process to reduce memory overhead
      }
    },
    // Reduce parallel execution to manage memory
    maxConcurrency: 1,
    // Timeout settings
    testTimeout: 3e4,
    hookTimeout: 1e4,
    // Test isolation - ensure clean DOM between tests
    isolate: true,
    // Clear mocks and DOM between tests
    clearMocks: true,
    restoreMocks: true
  },
  resolve: {
    alias: {
      "@": resolve(__vite_injected_original_dirname, "./src"),
      "@repo/ui": resolve(__vite_injected_original_dirname, "../../../packages/core/ui/src"),
      "@repo/profile": resolve(__vite_injected_original_dirname, "../../../packages/features/profile/src"),
      "@monorepo/shared": resolve(__vite_injected_original_dirname, "../../../packages/shared/src")
    }
  }
});
export {
  vitest_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZXN0LmNvbmZpZy50cyJdLAogICJzb3VyY2VzQ29udGVudCI6IFsiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL2FwcHMvd2ViL2xlZ28tbW9jLWluc3RydWN0aW9ucy1hcHBcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL2FwcHMvd2ViL2xlZ28tbW9jLWluc3RydWN0aW9ucy1hcHAvdml0ZXN0LmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9hcHBzL3dlYi9sZWdvLW1vYy1pbnN0cnVjdGlvbnMtYXBwL3ZpdGVzdC5jb25maWcudHNcIjtpbXBvcnQgeyByZXNvbHZlIH0gZnJvbSAnbm9kZTpwYXRoJ1xuaW1wb3J0IHsgZGVmaW5lQ29uZmlnIH0gZnJvbSAndml0ZXN0L2NvbmZpZydcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKHtcbiAgdGVzdDoge1xuICAgIGdsb2JhbHM6IHRydWUsXG4gICAgZW52aXJvbm1lbnQ6ICdqc2RvbScsXG4gICAgc2V0dXBGaWxlczogWycuL3NyYy9fX3Rlc3RzX18vc2V0dXAudHMnXSxcbiAgICAvLyBNZW1vcnkgbWFuYWdlbWVudFxuICAgIHBvb2w6ICdmb3JrcycsXG4gICAgcG9vbE9wdGlvbnM6IHtcbiAgICAgIGZvcmtzOiB7XG4gICAgICAgIHNpbmdsZUZvcms6IHRydWUsIC8vIFJ1biB0ZXN0cyBpbiBzaW5nbGUgcHJvY2VzcyB0byByZWR1Y2UgbWVtb3J5IG92ZXJoZWFkXG4gICAgICB9LFxuICAgIH0sXG4gICAgLy8gUmVkdWNlIHBhcmFsbGVsIGV4ZWN1dGlvbiB0byBtYW5hZ2UgbWVtb3J5XG4gICAgbWF4Q29uY3VycmVuY3k6IDEsXG4gICAgLy8gVGltZW91dCBzZXR0aW5nc1xuICAgIHRlc3RUaW1lb3V0OiAzMDAwMCxcbiAgICBob29rVGltZW91dDogMTAwMDAsXG4gICAgLy8gVGVzdCBpc29sYXRpb24gLSBlbnN1cmUgY2xlYW4gRE9NIGJldHdlZW4gdGVzdHNcbiAgICBpc29sYXRlOiB0cnVlLFxuICAgIC8vIENsZWFyIG1vY2tzIGFuZCBET00gYmV0d2VlbiB0ZXN0c1xuICAgIGNsZWFyTW9ja3M6IHRydWUsXG4gICAgcmVzdG9yZU1vY2tzOiB0cnVlLFxuICB9LFxuICByZXNvbHZlOiB7XG4gICAgYWxpYXM6IHtcbiAgICAgICdAJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgICAgJ0ByZXBvL3VpJzogcmVzb2x2ZShfX2Rpcm5hbWUsICcuLi8uLi8uLi9wYWNrYWdlcy9jb3JlL3VpL3NyYycpLFxuICAgICAgJ0ByZXBvL3Byb2ZpbGUnOiByZXNvbHZlKF9fZGlybmFtZSwgJy4uLy4uLy4uL3BhY2thZ2VzL2ZlYXR1cmVzL3Byb2ZpbGUvc3JjJyksXG4gICAgICAnQG1vbm9yZXBvL3NoYXJlZCc6IHJlc29sdmUoX19kaXJuYW1lLCAnLi4vLi4vLi4vcGFja2FnZXMvc2hhcmVkL3NyYycpLFxuICAgIH0sXG4gIH0sXG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUEwWixTQUFTLGVBQWU7QUFDbGIsU0FBUyxvQkFBb0I7QUFEN0IsSUFBTSxtQ0FBbUM7QUFHekMsSUFBTyx3QkFBUSxhQUFhO0FBQUEsRUFDMUIsTUFBTTtBQUFBLElBQ0osU0FBUztBQUFBLElBQ1QsYUFBYTtBQUFBLElBQ2IsWUFBWSxDQUFDLDBCQUEwQjtBQUFBO0FBQUEsSUFFdkMsTUFBTTtBQUFBLElBQ04sYUFBYTtBQUFBLE1BQ1gsT0FBTztBQUFBLFFBQ0wsWUFBWTtBQUFBO0FBQUEsTUFDZDtBQUFBLElBQ0Y7QUFBQTtBQUFBLElBRUEsZ0JBQWdCO0FBQUE7QUFBQSxJQUVoQixhQUFhO0FBQUEsSUFDYixhQUFhO0FBQUE7QUFBQSxJQUViLFNBQVM7QUFBQTtBQUFBLElBRVQsWUFBWTtBQUFBLElBQ1osY0FBYztBQUFBLEVBQ2hCO0FBQUEsRUFDQSxTQUFTO0FBQUEsSUFDUCxPQUFPO0FBQUEsTUFDTCxLQUFLLFFBQVEsa0NBQVcsT0FBTztBQUFBLE1BQy9CLFlBQVksUUFBUSxrQ0FBVywrQkFBK0I7QUFBQSxNQUM5RCxpQkFBaUIsUUFBUSxrQ0FBVyx3Q0FBd0M7QUFBQSxNQUM1RSxvQkFBb0IsUUFBUSxrQ0FBVyw4QkFBOEI7QUFBQSxJQUN2RTtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogW10KfQo=
