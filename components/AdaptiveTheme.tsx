"use client";

import { useEffect } from "react";

function isDark(): boolean {
  // Respect the user's OS preference first
  if (window.matchMedia("(prefers-color-scheme: dark)").matches) return true;
  if (window.matchMedia("(prefers-color-scheme: light)").matches) return false;
  // Fallback for browsers without prefers-color-scheme: time-based
  const h = new Date().getHours();
  return h < 6 || h >= 19;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  const next = dark ? "dark" : "light";
  if (root.getAttribute("data-theme") === next) return;
  root.setAttribute("data-theme", next);
  root.classList.toggle("dark", dark);
}

export default function AdaptiveTheme() {
  useEffect(() => {
    applyTheme(isDark());

    // React to OS preference changes in real time
    const mqDark = window.matchMedia("(prefers-color-scheme: dark)");
    const onMqChange = () => applyTheme(isDark());
    mqDark.addEventListener("change", onMqChange);

    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") applyTheme(isDark());
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      mqDark.removeEventListener("change", onMqChange);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, []);

  return null;
}
