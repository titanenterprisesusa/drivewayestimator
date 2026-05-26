import { createRoot } from "react-dom/client";
import { setBaseUrl } from "@workspace/api-client-react";
import { apiBase } from "@/lib/api-base";
import App from "./App";
import "./index.css";

// When deployed to Netlify, VITE_API_URL points to the Replit backend.
// In development this is "" so all calls stay relative (same server).
setBaseUrl(apiBase || null);

createRoot(document.getElementById("root")!).render(<App />);
