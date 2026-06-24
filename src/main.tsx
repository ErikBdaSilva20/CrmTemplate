import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";

const savedTheme = localStorage.getItem("fc-theme") || "light";
if (savedTheme === "system") {
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  document.documentElement.classList.add(prefersDark ? "dark" : "light");
} else {
  document.documentElement.classList.add(savedTheme);
}

createRoot(document.getElementById("root")!).render(<App />);
