import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  base: "./",
  plugins: [react()],
  build: {
    outDir: "dist",
    minify: false,
    emptyOutDir: true,
  },
  server: {
    watch: {
      ignored: ["**/android/**", "**/ios/**"],
    },
  },
});
