import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  base: "/life-improver/",
  server: { port: 5173, open: true },
});
