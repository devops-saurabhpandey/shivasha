import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// GitHub Pages serves this project from /shivasha/.
// Render serves it from the domain root (/).
const base = process.env.GITHUB_ACTIONS ? "/shivasha/" : "/";

export default defineConfig({
  base,
  plugins: [react()]
});
