import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import { nitro } from "nitro/vite";

export default defineConfig({
  plugins: [
    tanstackStart(),
    // Disable Nitro's static index.html renderer so TanStack Start SSR handles pages.
    nitro({ renderer: false }),
    react(),
    tailwindcss(),
    tsconfigPaths(),
  ],
  optimizeDeps: {
    exclude: ["@tanstack/react-start"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("node_modules")) return;
          if (id.includes("@clerk")) return "vendor-clerk";
          if (id.includes("framer-motion") || id.includes("motion-dom")) return "vendor-motion";
          if (id.includes("@radix-ui")) return "vendor-radix";
        },
      },
    },
  },
});
