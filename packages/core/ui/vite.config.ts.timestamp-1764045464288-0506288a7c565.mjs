// vite.config.ts
import path from "path";
import { fileURLToPath } from "url";
import { defineConfig } from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite@5.4.21_@types+node@24.9.1_lightningcss@1.30.2_terser@5.44.1/node_modules/vite/dist/node/index.js";
import react from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/@vitejs+plugin-react@4.7.0_vite@5.4.21_@types+node@22.19.1_lightningcss@1.30.2_terser@5.44.1_/node_modules/@vitejs/plugin-react/dist/index.js";
import dts from "file:///Users/michaelmenard/Development/Monorepo/node_modules/.pnpm/vite-plugin-dts@4.5.4_@types+node@22.19.1_rollup@4.53.3_typescript@5.8.3_vite@5.4.21_@types+n_4yymza3lunumbf5kmcogzeo6gi/node_modules/vite-plugin-dts/dist/index.mjs";
var __vite_injected_original_import_meta_url = "file:///Users/michaelmenard/Development/Monorepo/packages/core/ui/vite.config.ts";
var __dirname = path.dirname(fileURLToPath(__vite_injected_original_import_meta_url));
var vite_config_default = defineConfig(({ mode }) => {
  return {
    plugins: [
      react(),
      dts({
        insertTypesEntry: true,
        exclude: ["**/*.stories.ts", "**/*.stories.tsx", "**/*.test.ts", "**/*.test.tsx"]
      })
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src")
      }
    },
    build: {
      lib: {
        entry: path.resolve(__dirname, "src/index.ts"),
        name: "UI",
        fileName: "index",
        formats: ["es"]
      },
      outDir: "dist",
      sourcemap: mode === "development",
      rollupOptions: {
        external: [
          "react",
          "react-dom",
          /^@radix-ui\/.*/,
          "class-variance-authority",
          "clsx",
          "framer-motion",
          "lucide-react",
          "tailwind-merge",
          "tailwindcss",
          "tailwindcss-animate",
          "@reduxjs/toolkit",
          "react-hook-form",
          "@hookform/resolvers",
          "zod",
          "browser-image-compression",
          "react-dropzone",
          "react-easy-crop",
          "cmdk",
          "i18next",
          "react-i18next",
          "next-themes",
          "sonner"
        ],
        output: {
          // Ensure proper file extensions for ES modules
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
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsidml0ZS5jb25maWcudHMiXSwKICAic291cmNlc0NvbnRlbnQiOiBbImNvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9kaXJuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9jb3JlL3VpXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ZpbGVuYW1lID0gXCIvVXNlcnMvbWljaGFlbG1lbmFyZC9EZXZlbG9wbWVudC9Nb25vcmVwby9wYWNrYWdlcy9jb3JlL3VpL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9taWNoYWVsbWVuYXJkL0RldmVsb3BtZW50L01vbm9yZXBvL3BhY2thZ2VzL2NvcmUvdWkvdml0ZS5jb25maWcudHNcIjtpbXBvcnQgcGF0aCBmcm9tICdwYXRoJ1xuaW1wb3J0IHsgZmlsZVVSTFRvUGF0aCB9IGZyb20gJ3VybCdcbmltcG9ydCB7IGRlZmluZUNvbmZpZyB9IGZyb20gJ3ZpdGUnXG5pbXBvcnQgcmVhY3QgZnJvbSAnQHZpdGVqcy9wbHVnaW4tcmVhY3QnXG5pbXBvcnQgZHRzIGZyb20gJ3ZpdGUtcGx1Z2luLWR0cydcblxuY29uc3QgX19kaXJuYW1lID0gcGF0aC5kaXJuYW1lKGZpbGVVUkxUb1BhdGgoaW1wb3J0Lm1ldGEudXJsKSlcblxuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IG1vZGUgfSkgPT4ge1xuICByZXR1cm4ge1xuICAgIHBsdWdpbnM6IFtcbiAgICAgIHJlYWN0KCksXG4gICAgICBkdHMoe1xuICAgICAgICBpbnNlcnRUeXBlc0VudHJ5OiB0cnVlLFxuICAgICAgICBleGNsdWRlOiBbJyoqLyouc3Rvcmllcy50cycsICcqKi8qLnN0b3JpZXMudHN4JywgJyoqLyoudGVzdC50cycsICcqKi8qLnRlc3QudHN4J10sXG4gICAgICB9KSxcbiAgICBdLFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJy4vc3JjJyksXG4gICAgICB9LFxuICAgIH0sXG4gICAgYnVpbGQ6IHtcbiAgICAgIGxpYjoge1xuICAgICAgICBlbnRyeTogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYy9pbmRleC50cycpLFxuICAgICAgICBuYW1lOiAnVUknLFxuICAgICAgICBmaWxlTmFtZTogJ2luZGV4JyxcbiAgICAgICAgZm9ybWF0czogWydlcyddLFxuICAgICAgfSxcbiAgICAgIG91dERpcjogJ2Rpc3QnLFxuICAgICAgc291cmNlbWFwOiBtb2RlID09PSAnZGV2ZWxvcG1lbnQnLFxuICAgICAgcm9sbHVwT3B0aW9uczoge1xuICAgICAgICBleHRlcm5hbDogW1xuICAgICAgICAgICdyZWFjdCcsXG4gICAgICAgICAgJ3JlYWN0LWRvbScsXG4gICAgICAgICAgL15AcmFkaXgtdWlcXC8uKi8sXG4gICAgICAgICAgJ2NsYXNzLXZhcmlhbmNlLWF1dGhvcml0eScsXG4gICAgICAgICAgJ2Nsc3gnLFxuICAgICAgICAgICdmcmFtZXItbW90aW9uJyxcbiAgICAgICAgICAnbHVjaWRlLXJlYWN0JyxcbiAgICAgICAgICAndGFpbHdpbmQtbWVyZ2UnLFxuICAgICAgICAgICd0YWlsd2luZGNzcycsXG4gICAgICAgICAgJ3RhaWx3aW5kY3NzLWFuaW1hdGUnLFxuICAgICAgICAgICdAcmVkdXhqcy90b29sa2l0JyxcbiAgICAgICAgICAncmVhY3QtaG9vay1mb3JtJyxcbiAgICAgICAgICAnQGhvb2tmb3JtL3Jlc29sdmVycycsXG4gICAgICAgICAgJ3pvZCcsXG4gICAgICAgICAgJ2Jyb3dzZXItaW1hZ2UtY29tcHJlc3Npb24nLFxuICAgICAgICAgICdyZWFjdC1kcm9wem9uZScsXG4gICAgICAgICAgJ3JlYWN0LWVhc3ktY3JvcCcsXG4gICAgICAgICAgJ2NtZGsnLFxuICAgICAgICAgICdpMThuZXh0JyxcbiAgICAgICAgICAncmVhY3QtaTE4bmV4dCcsXG4gICAgICAgICAgJ25leHQtdGhlbWVzJyxcbiAgICAgICAgICAnc29ubmVyJyxcbiAgICAgICAgXSxcbiAgICAgICAgb3V0cHV0OiB7XG4gICAgICAgICAgLy8gRW5zdXJlIHByb3BlciBmaWxlIGV4dGVuc2lvbnMgZm9yIEVTIG1vZHVsZXNcbiAgICAgICAgICBlbnRyeUZpbGVOYW1lczogJ1tuYW1lXS5qcycsXG4gICAgICAgICAgY2h1bmtGaWxlTmFtZXM6ICdbbmFtZV0uanMnLFxuICAgICAgICAgIGdsb2JhbHM6IHtcbiAgICAgICAgICAgIHJlYWN0OiAnUmVhY3QnLFxuICAgICAgICAgICAgJ3JlYWN0LWRvbSc6ICdSZWFjdERPTScsXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgfSxcbiAgICBkZWZpbmU6IHtcbiAgICAgIF9fREVWX186IG1vZGUgPT09ICdkZXZlbG9wbWVudCcsXG4gICAgfSxcbiAgfVxufSlcbiJdLAogICJtYXBwaW5ncyI6ICI7QUFBZ1csT0FBTyxVQUFVO0FBQ2pYLFNBQVMscUJBQXFCO0FBQzlCLFNBQVMsb0JBQW9CO0FBQzdCLE9BQU8sV0FBVztBQUNsQixPQUFPLFNBQVM7QUFKNE0sSUFBTSwyQ0FBMkM7QUFNN1EsSUFBTSxZQUFZLEtBQUssUUFBUSxjQUFjLHdDQUFlLENBQUM7QUFFN0QsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxLQUFLLE1BQU07QUFDeEMsU0FBTztBQUFBLElBQ0wsU0FBUztBQUFBLE1BQ1AsTUFBTTtBQUFBLE1BQ04sSUFBSTtBQUFBLFFBQ0Ysa0JBQWtCO0FBQUEsUUFDbEIsU0FBUyxDQUFDLG1CQUFtQixvQkFBb0IsZ0JBQWdCLGVBQWU7QUFBQSxNQUNsRixDQUFDO0FBQUEsSUFDSDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsV0FBVyxPQUFPO0FBQUEsTUFDdEM7QUFBQSxJQUNGO0FBQUEsSUFDQSxPQUFPO0FBQUEsTUFDTCxLQUFLO0FBQUEsUUFDSCxPQUFPLEtBQUssUUFBUSxXQUFXLGNBQWM7QUFBQSxRQUM3QyxNQUFNO0FBQUEsUUFDTixVQUFVO0FBQUEsUUFDVixTQUFTLENBQUMsSUFBSTtBQUFBLE1BQ2hCO0FBQUEsTUFDQSxRQUFRO0FBQUEsTUFDUixXQUFXLFNBQVM7QUFBQSxNQUNwQixlQUFlO0FBQUEsUUFDYixVQUFVO0FBQUEsVUFDUjtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFVBQ0E7QUFBQSxVQUNBO0FBQUEsVUFDQTtBQUFBLFFBQ0Y7QUFBQSxRQUNBLFFBQVE7QUFBQTtBQUFBLFVBRU4sZ0JBQWdCO0FBQUEsVUFDaEIsZ0JBQWdCO0FBQUEsVUFDaEIsU0FBUztBQUFBLFlBQ1AsT0FBTztBQUFBLFlBQ1AsYUFBYTtBQUFBLFVBQ2Y7QUFBQSxRQUNGO0FBQUEsTUFDRjtBQUFBLElBQ0Y7QUFBQSxJQUNBLFFBQVE7QUFBQSxNQUNOLFNBQVMsU0FBUztBQUFBLElBQ3BCO0FBQUEsRUFDRjtBQUNGLENBQUM7IiwKICAibmFtZXMiOiBbXQp9Cg==
