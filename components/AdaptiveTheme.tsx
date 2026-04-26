"use client";

import { useEffect } from "react";

function isDarkHour(): boolean {
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
    applyTheme(isDarkHour());

    const interval = setInterval(() => {
      applyTheme(isDarkHour());
    }, 60_000);

    return () => clearInterval(interval);
  }, []);

  return null;
}
