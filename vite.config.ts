import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
export default defineConfig(({ mode }) => ({
  base: mode === "github" ? "/VibePlacement/" : "/",
  plugins: [react(), tailwindcss()],
  cacheDir: "node_modules/.vite",
  optimizeDeps: {
    include: [
      "three",
      "three/examples/jsm/loaders/GLTFLoader.js",
      "three/examples/jsm/loaders/FBXLoader.js",
      "three/examples/jsm/loaders/OBJLoader.js",
    ],
  },
  server: { port: 5186, strictPort: true },
}));
