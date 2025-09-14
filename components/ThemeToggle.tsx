"use client";
import { useEffect, useState } from "react";

type Theme = "light" | "dark" | "sepia" | "contrast";

function getStoredTheme(): Theme | null {
  try {
    const raw = localStorage.getItem("tp:settings");
    if (!raw) return null;
    const obj = JSON.parse(raw);
    if (obj && typeof obj.theme === "string") return obj.theme as Theme;
  } catch {}
  return null;
}

function setStoredTheme(theme: Theme) {
  try {
    const raw = localStorage.getItem("tp:settings");
    const obj = raw ? JSON.parse(raw) : {};
    obj.theme = theme;
    localStorage.setItem("tp:settings", JSON.stringify(obj));
  } catch {}
}

function applyBodyTheme(theme: Theme) {
  const themes = ["theme-light","theme-dark","theme-sepia","theme-contrast"];
  document.body.classList.remove(...themes);
  document.body.classList.add(`theme-${theme}`);
}

export default function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const stored = getStoredTheme();
    if (stored) {
      setTheme(stored);
      applyBodyTheme(stored);
    } else {
      const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
      const t: Theme = prefersDark ? "dark" : "light";
      setTheme(t);
      applyBodyTheme(t);
    }
  }, []);

  const toggle = () => {
    const next: Theme = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyBodyTheme(next);
    setStoredTheme(next);
  };

  return (
    <button
      type="button"
      aria-label="Toggle theme"
      className="btn btn-ghost"
      onClick={toggle}
      title={theme === "dark" ? "Switch to light" : "Switch to dark"}
    >
      {theme === "dark" ? (
        // Sun icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2m0 16v2m10-10h-2M4 12H2m15.364 6.364-1.414-1.414M7.05 7.05 5.636 5.636m12.728 0-1.414 1.414M7.05 16.95l-1.414 1.414" />
        </svg>
      ) : (
        // Moon icon
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}

