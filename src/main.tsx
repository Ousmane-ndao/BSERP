import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

if (import.meta.env.DEV && "serviceWorker" in navigator) {
  // Avoid stale SW cache/network strategies interfering with local development.
  void navigator.serviceWorker.getRegistrations().then((registrations) => {
    registrations.forEach((registration) => {
      void registration.unregister();
    });
  });
}

createRoot(document.getElementById("root")!).render(<App />);