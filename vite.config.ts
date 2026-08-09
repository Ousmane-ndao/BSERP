import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  const rawApiUrl = (env.VITE_API_URL ?? "").trim();
  const defaultTarget = "http://localhost:8000";
  let proxyTarget = defaultTarget;
  if (rawApiUrl) {
    try {
      proxyTarget = new URL(rawApiUrl).origin;
    } catch {
      proxyTarget = defaultTarget;
    }
  }
  return {
    server: {
      host: "::",
      port: 8080,
      hmr: { overlay: false },
      proxy: {
        "/api": {
          target: proxyTarget,
          changeOrigin: true,
          rewrite: (path) => path,
        },
      },
    },
    plugins: [react()].filter(Boolean),
    resolve: {
      alias: { "@": path.resolve(__dirname, "./src") },
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime", "@tanstack/react-query", "@tanstack/query-core"],
    },
  };
});