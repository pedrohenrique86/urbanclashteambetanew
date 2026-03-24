import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr"; // 1. Importar o plugin

export default defineConfig({
  plugins: [react(), svgr()], // 2. Adicionar o plugin à lista
  server: {
    port: 3000,
    open: true,
  },
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});