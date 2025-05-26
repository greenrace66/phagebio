
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
    proxy: {
      '/api/esmfold': {
        target: 'https://health.api.nvidia.com/v1/biology/nvidia/esmfold',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/esmfold/, ''),
        secure: false,
      },
      '/api/alphafold2': {
        target: 'https://health.api.nvidia.com/v1/biology/deepmind/alphafold2',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/alphafold2/, ''),
        secure: false,
      }
    }
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));
