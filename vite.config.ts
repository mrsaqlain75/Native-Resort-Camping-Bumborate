import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    allowedHosts: [
      "localhost",
      ".ngrok-free.app",
      ".ngrok.io"
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "./src"),
      "@contracts": path.resolve(process.cwd(), "./contracts"),
      "@db": path.resolve(process.cwd(), "./db"),
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    cssMinify: false,  // Disable CSS minification to fix Tailwind v4 issue
  },
});