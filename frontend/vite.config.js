import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/detect": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ocr": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/ask": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/speak": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/listen": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/history": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
      "/digital-twin": {
        target: "http://127.0.0.1:8000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
