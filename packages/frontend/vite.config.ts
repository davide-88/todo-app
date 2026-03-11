import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";
import type { Plugin } from "vite";

function nonBlockingCss(): Plugin {
  return {
    name: "non-blocking-css",
    apply: "build",
    transformIndexHtml(html) {
      return html.replace(
        /<link rel="stylesheet" crossorigin href="([^"]+\.css)">/g,
        `<link rel="preload" as="style" crossorigin href="$1" onload="this.onload=null;this.rel='stylesheet'"><noscript><link rel="stylesheet" crossorigin href="$1"></noscript>`,
      );
    },
  };
}

export default defineConfig({
  plugins: [react(), tailwindcss(), nonBlockingCss()],
  resolve: {
    alias: {
      "@": resolve(__dirname, "./src"),
    },
  },
});
