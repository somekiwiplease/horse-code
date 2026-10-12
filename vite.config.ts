import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// relative base so the build works on GitHub Pages (/horse-code/) or any other host
export default defineConfig({
  base: "./",
  plugins: [react()],
});
