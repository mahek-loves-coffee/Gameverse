import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    host: "0.0.0.0",
    strictPort: true,
    proxy: {
      "/api": "http://127.0.0.1:4000",
      "/socket.io": { target: "http://127.0.0.1:4000", ws: true }
    }
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes("/node_modules/")) return;
          if (
            id.includes("/node_modules/@react-three/") ||
            id.includes("/node_modules/three-stdlib/")
          ) return "r3f-vendor";
          if (id.includes("/node_modules/three/")) return "three-vendor";
          if (
            id.includes("/node_modules/react/") ||
            id.includes("/node_modules/react-dom/") ||
            id.includes("/node_modules/scheduler/")
          ) return "react-vendor";
          if (
            id.includes("/node_modules/socket.io-client/") ||
            id.includes("/node_modules/engine.io-client/") ||
            id.includes("/node_modules/socket.io-parser/")
          ) return "socket-vendor";
        }
      }
    }
  }
});
