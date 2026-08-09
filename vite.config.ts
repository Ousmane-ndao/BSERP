import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");

  // Détermine la cible du proxy : utilise VITE_API_URL si définie, sinon http://localhost:8000
  const rawApiUrl = (env.VITE_API_URL ?? "").trim();
  const defaultTarget = "http://localhost:8000";
  let proxyTarget = defaultTarget;

  if (rawApiUrl) {
    try {
      // Extraire l'origine de l'URL (ex: http://localhost:8000)
      proxyTarget = new URL(rawApiUrl).origin;
    } catch {
      proxyTarget = defaultTarget;
    }
  }

  return {
    server: {
      host: "::", // écoute sur toutes les interfaces
      port: 8080,
      hmr: {
        overlay: false,
      },
      // Proxy des requêtes /api vers le backend Laravel
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path, // garde le chemin intact
        },
      },
    },
    plugins: [
      react(), // <-- Plus de componentTagger ici
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./src"),
      },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});