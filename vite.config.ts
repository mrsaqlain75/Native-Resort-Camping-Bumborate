import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

// Get the absolute path to src directory
const srcPath = path.resolve(process.cwd(), "src");

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": srcPath,
      "@contracts": path.resolve(process.cwd(), "contracts"),
      "@db": path.resolve(process.cwd(), "db"),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
