// vite.config.ts
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
import tailwindcss from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@tailwindcss+vite@4.1.11_vite@5.4.19_@types+node@24.1.0_lightningcss@1.30.1_/node_modules/@tailwindcss/vite/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/features/ImageUploadModal/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src")
    }
  },
  build: {
    lib: {
      entry: path.resolve(__dirname, "index.tsx"),
      name: "ImageUploadModal",
      fileName: "index",
      formats: ["es", "cjs"]
    },
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: ["react", "react-dom", "zod", "@repo/ui", "@monorepo/fileupload"],
      output: {
        globals: {
          react: "React",
          "react-dom": "ReactDOM",
          zod: "zod",
          "@repo/ui": "RepoUI",
          "@monorepo/fileupload": "RepoFileUpload"
        }
      }
    }
  },
  define: {
    __DEV__: false
  }
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9mZWF0dXJlcy9JbWFnZVVwbG9hZE1vZGFsXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9mZWF0dXJlcy9JbWFnZVVwbG9hZE1vZGFsL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL3BhY2thZ2VzL2ZlYXR1cmVzL0ltYWdlVXBsb2FkTW9kYWwvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcbmltcG9ydCB0YWlsd2luZGNzcyBmcm9tICdAdGFpbHdpbmRjc3Mvdml0ZSdcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZyh7XG4gIHBsdWdpbnM6IFtyZWFjdCgpLCB0YWlsd2luZGNzcygpXSxcbiAgcmVzb2x2ZToge1xuICAgIGFsaWFzOiB7XG4gICAgICAnQCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuL3NyYycpLFxuICAgIH0sXG4gIH0sXG4gIGJ1aWxkOiB7XG4gICAgbGliOiB7XG4gICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ2luZGV4LnRzeCcpLFxuICAgICAgbmFtZTogJ0ltYWdlVXBsb2FkTW9kYWwnLFxuICAgICAgZmlsZU5hbWU6ICdpbmRleCcsXG4gICAgICBmb3JtYXRzOiBbJ2VzJywgJ2NqcyddLFxuICAgIH0sXG4gICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgc291cmNlbWFwOiB0cnVlLFxuICAgIHJvbGx1cE9wdGlvbnM6IHtcbiAgICAgIGV4dGVybmFsOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICd6b2QnLCAnQHJlcG8vdWknLCAnQG1vbm9yZXBvL2ZpbGV1cGxvYWQnXSxcbiAgICAgIG91dHB1dDoge1xuICAgICAgICBnbG9iYWxzOiB7XG4gICAgICAgICAgcmVhY3Q6ICdSZWFjdCcsXG4gICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTScsXG4gICAgICAgICAgem9kOiAnem9kJyxcbiAgICAgICAgICAnQHJlcG8vdWknOiAnUmVwb1VJJyxcbiAgICAgICAgICAnQG1vbm9yZXBvL2ZpbGV1cGxvYWQnOiAnUmVwb0ZpbGVVcGxvYWQnLFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICB9LFxuICBkZWZpbmU6IHtcbiAgICBfX0RFVl9fOiBmYWxzZSxcbiAgfSxcbn0pO1xuIl0sCiAgIm1hcHBpbmdzIjogIjtBQUFzWixTQUFTLG9CQUFvQjtBQUNuYixPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBQzlCLE9BQU8saUJBQWlCO0FBSndPLElBQU0sMkNBQTJDO0FBTWpULElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRTdELElBQU8sc0JBQVEsYUFBYTtBQUFBLEVBQzFCLFNBQVMsQ0FBQyxNQUFNLEdBQUcsWUFBWSxDQUFDO0FBQUEsRUFDaEMsU0FBUztBQUFBLElBQ1AsT0FBTztBQUFBLE1BQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxPQUFPO0FBQUEsSUFDdEM7QUFBQSxFQUNGO0FBQUEsRUFDQSxPQUFPO0FBQUEsSUFDTCxLQUFLO0FBQUEsTUFDSCxPQUFPLEtBQUssUUFBUSxXQUFXLFdBQVc7QUFBQSxNQUMxQyxNQUFNO0FBQUEsTUFDTixVQUFVO0FBQUEsTUFDVixTQUFTLENBQUMsTUFBTSxLQUFLO0FBQUEsSUFDdkI7QUFBQSxJQUNBLFFBQVE7QUFBQSxJQUNSLFdBQVc7QUFBQSxJQUNYLGVBQWU7QUFBQSxNQUNiLFVBQVUsQ0FBQyxTQUFTLGFBQWEsT0FBTyxZQUFZLHNCQUFzQjtBQUFBLE1BQzFFLFFBQVE7QUFBQSxRQUNOLFNBQVM7QUFBQSxVQUNQLE9BQU87QUFBQSxVQUNQLGFBQWE7QUFBQSxVQUNiLEtBQUs7QUFBQSxVQUNMLFlBQVk7QUFBQSxVQUNaLHdCQUF3QjtBQUFBLFFBQzFCO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxFQUNGO0FBQUEsRUFDQSxRQUFRO0FBQUEsSUFDTixTQUFTO0FBQUEsRUFDWDtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
