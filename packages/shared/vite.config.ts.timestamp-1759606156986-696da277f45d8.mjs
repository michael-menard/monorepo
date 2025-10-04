// vite.config.ts
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1_terser@5.43.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@vitejs+plugin-react-swc@3.11.0_@swc+helpers@0.5.17_vite@5.4.19_@types+node@24.2.1_lightningcss@1.30.1_terser@5.43.1_/node_modules/@vitejs/plugin-react-swc/index.js";
import path from "path";
import { fileURLToPath } from "url";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/shared/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [react()],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
        // Add workspace package aliases for better imports
        "@packages/ui": path.resolve(__dirname, "../ui/src"),
        "@packages/auth": path.resolve(__dirname, "../auth/src"),
        "@packages/wishlist": path.resolve(__dirname, "../wishlist/src"),
        "@packages/features": path.resolve(__dirname, "../features")
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "Shared",
        fileName: "index",
        formats: ["es", "cjs"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: ["react", "react-dom", "zod", "@repo/ui", "@repo/ui/lib/utils", "@repo/profile", "lucide-react"],
        output: {
          globals: {
            react: "React",
            "react-dom": "ReactDOM",
            zod: "zod",
            "@repo/ui": "RepoUI",
            "@repo/profile": "RepoProfile",
            "lucide-react": "LucideReact"
          }
        }
      }
    },
    define: {
      __DEV__: mode === "development",
      "process.env.NODE_ENV": JSON.stringify(mode)
    },
    optimizeDeps: {
      include: ["react", "react-dom"]
    }
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9zaGFyZWRcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL3BhY2thZ2VzL3NoYXJlZC92aXRlLmNvbmZpZy50c1wiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9pbXBvcnRfbWV0YV91cmwgPSBcImZpbGU6Ly8vVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9zaGFyZWQvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJztcbmltcG9ydCByZWFjdCBmcm9tICdAdml0ZWpzL3BsdWdpbi1yZWFjdC1zd2MnO1xuaW1wb3J0IHBhdGggZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBmaWxlVVJMVG9QYXRoIH0gZnJvbSAndXJsJztcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSk7XG5cbmV4cG9ydCBkZWZhdWx0IGRlZmluZUNvbmZpZygoeyBtb2RlIH0pID0+IHtcbiAgcmV0dXJuIHtcbiAgICBwbHVnaW5zOiBbcmVhY3QoKV0sXG4gICAgcmVzb2x2ZToge1xuICAgICAgYWxpYXM6IHtcbiAgICAgICAgJ0AnOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi9zcmMnKSxcbiAgICAgICAgLy8gQWRkIHdvcmtzcGFjZSBwYWNrYWdlIGFsaWFzZXMgZm9yIGJldHRlciBpbXBvcnRzXG4gICAgICAgICdAcGFja2FnZXMvdWknOiBwYXRoLnJlc29sdmUoX19kaXJuYW1lLCAnLi4vdWkvc3JjJyksXG4gICAgICAgICdAcGFja2FnZXMvYXV0aCc6IHBhdGgucmVzb2x2ZShfX2Rpcm5hbWUsICcuLi9hdXRoL3NyYycpLFxuICAgICAgICAnQHBhY2thZ2VzL3dpc2hsaXN0JzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL3dpc2hsaXN0L3NyYycpLFxuICAgICAgICAnQHBhY2thZ2VzL2ZlYXR1cmVzJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4uL2ZlYXR1cmVzJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIGxpYjoge1xuICAgICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpLFxuICAgICAgICBuYW1lOiAnU2hhcmVkJyxcbiAgICAgICAgZmlsZU5hbWU6ICdpbmRleCcsXG4gICAgICAgIGZvcm1hdHM6IFsnZXMnLCAnY2pzJ10sXG4gICAgICB9LFxuICAgICAgb3V0RGlyOiAnZGlzdCcsXG4gICAgICBzb3VyY2VtYXA6IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgICByb2xsdXBPcHRpb25zOiB7XG4gICAgICAgIGV4dGVybmFsOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbScsICd6b2QnLCAnQHJlcG8vdWknLCAnQHJlcG8vdWkvbGliL3V0aWxzJywgJ0ByZXBvL3Byb2ZpbGUnLCAnbHVjaWRlLXJlYWN0J10sXG4gICAgICAgIG91dHB1dDoge1xuICAgICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICAgIHJlYWN0OiAnUmVhY3QnLFxuICAgICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTScsXG4gICAgICAgICAgICB6b2Q6ICd6b2QnLFxuICAgICAgICAgICAgJ0ByZXBvL3VpJzogJ1JlcG9VSScsXG4gICAgICAgICAgICAnQHJlcG8vcHJvZmlsZSc6ICdSZXBvUHJvZmlsZScsXG4gICAgICAgICAgICAnbHVjaWRlLXJlYWN0JzogJ0x1Y2lkZVJlYWN0JyxcbiAgICAgICAgICB9LFxuICAgICAgICB9LFxuICAgICAgfSxcbiAgICB9LFxuICAgIGRlZmluZToge1xuICAgICAgX19ERVZfXzogbW9kZSA9PT0gJ2RldmVsb3BtZW50JyxcbiAgICAgICdwcm9jZXNzLmVudi5OT0RFX0VOVic6IEpTT04uc3RyaW5naWZ5KG1vZGUpLFxuICAgIH0sXG4gICAgb3B0aW1pemVEZXBzOiB7XG4gICAgICBpbmNsdWRlOiBbJ3JlYWN0JywgJ3JlYWN0LWRvbSddLFxuICAgIH0sXG4gIH07XG59KTsgIl0sCiAgIm1hcHBpbmdzIjogIjtBQUE2VixTQUFTLG9CQUFvQjtBQUMxWCxPQUFPLFdBQVc7QUFDbEIsT0FBTyxVQUFVO0FBQ2pCLFNBQVMscUJBQXFCO0FBSDRMLElBQU0sMkNBQTJDO0FBSzNRLElBQU0sWUFBWSxLQUFLLFFBQVEsY0FBYyx3Q0FBZSxDQUFDO0FBRTdELElBQU8sc0JBQVEsYUFBYSxDQUFDLEVBQUUsS0FBSyxNQUFNO0FBQ3hDLFNBQU87QUFBQSxJQUNMLFNBQVMsQ0FBQyxNQUFNLENBQUM7QUFBQSxJQUNqQixTQUFTO0FBQUEsTUFDUCxPQUFPO0FBQUEsUUFDTCxLQUFLLEtBQUssUUFBUSxXQUFXLE9BQU87QUFBQTtBQUFBLFFBRXBDLGdCQUFnQixLQUFLLFFBQVEsV0FBVyxXQUFXO0FBQUEsUUFDbkQsa0JBQWtCLEtBQUssUUFBUSxXQUFXLGFBQWE7QUFBQSxRQUN2RCxzQkFBc0IsS0FBSyxRQUFRLFdBQVcsaUJBQWlCO0FBQUEsUUFDL0Qsc0JBQXNCLEtBQUssUUFBUSxXQUFXLGFBQWE7QUFBQSxNQUM3RDtBQUFBLElBQ0Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLEtBQUs7QUFBQSxRQUNILE9BQU8sS0FBSyxRQUFRLFdBQVcsY0FBYztBQUFBLFFBQzdDLE1BQU07QUFBQSxRQUNOLFVBQVU7QUFBQSxRQUNWLFNBQVMsQ0FBQyxNQUFNLEtBQUs7QUFBQSxNQUN2QjtBQUFBLE1BQ0EsUUFBUTtBQUFBLE1BQ1IsV0FBVyxTQUFTO0FBQUEsTUFDcEIsZUFBZTtBQUFBLFFBQ2IsVUFBVSxDQUFDLFNBQVMsYUFBYSxPQUFPLFlBQVksc0JBQXNCLGlCQUFpQixjQUFjO0FBQUEsUUFDekcsUUFBUTtBQUFBLFVBQ04sU0FBUztBQUFBLFlBQ1AsT0FBTztBQUFBLFlBQ1AsYUFBYTtBQUFBLFlBQ2IsS0FBSztBQUFBLFlBQ0wsWUFBWTtBQUFBLFlBQ1osaUJBQWlCO0FBQUEsWUFDakIsZ0JBQWdCO0FBQUEsVUFDbEI7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLFNBQVMsU0FBUztBQUFBLE1BQ2xCLHdCQUF3QixLQUFLLFVBQVUsSUFBSTtBQUFBLElBQzdDO0FBQUEsSUFDQSxjQUFjO0FBQUEsTUFDWixTQUFTLENBQUMsU0FBUyxXQUFXO0FBQUEsSUFDaEM7QUFBQSxFQUNGO0FBQ0YsQ0FBQzsiLAogICJuYW1lcyI6IFtdCn0K
