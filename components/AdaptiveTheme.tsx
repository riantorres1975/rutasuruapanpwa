"use client";

import { useEffect } from "react";

function isDarkHour(): boolean {
  const h = new Date().getHours();
  return h < 6 || h >= 19;
}

function applyTheme(dark: boolean) {
  const root = document.documentElement;
  root.setAttribute("data-theme", dark ? "dark" : "light");
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
