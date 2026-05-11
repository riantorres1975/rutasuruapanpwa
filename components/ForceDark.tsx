"use client";

import { useEffect } from "react";

export default function ForceDark() {
  useEffect(() => {
    const root = document.documentElement;
    const prev = root.getAttribute("data-theme");
    const hadDarkClass = root.classList.contains("dark");
    root.setAttribute("data-theme", "dark");
    root.classList.add("dark");
    return () => {
      if (prev) root.setAttribute("data-theme", prev);
      else root.removeAttribute("data-theme");
      root.classList.toggle("dark", hadDarkClass);
    };
  }, []);
  return null;
}
