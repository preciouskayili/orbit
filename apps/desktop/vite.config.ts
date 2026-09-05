import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "node:path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          "react-vendor": ["react", "react-dom/client", "react-router-dom"],
          "base-ui": ["@base-ui/react"],
          markdown: ["react-markdown", "remark-gfm"],
          query: ["@tanstack/react-query"],
        },
      },
    },
  },
});
