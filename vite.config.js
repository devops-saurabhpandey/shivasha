import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";

// GitHub Pages serves this project from /shivasha/.
// Render serves it from the domain root (/).
const base = process.env.GITHUB_ACTIONS ? "/shivasha/" : "/";

export default defineConfig({
  base,
  plugins: [react()],
  build: {
    rollupOptions: {
      input: {
        social: fileURLToPath(new URL("./index.html", import.meta.url)),
        business: fileURLToPath(new URL("./business.html", import.meta.url)),
        edutech: fileURLToPath(new URL("./edutech.html", import.meta.url)),
        enterprise: fileURLToPath(new URL("./enterprise.html", import.meta.url))
      }
    }
  }
});
