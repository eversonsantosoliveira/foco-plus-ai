import { useEffect, useState, useCallback } from "react";

export type ThemePref = "light" | "dark" | "system";

function applyTheme(pref: ThemePref) {
  const root = document.documentElement;
  const isDark =
    pref === "dark" ||
    (pref === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
  root.classList.toggle("dark", isDark);
}

export function useTheme() {
  const [pref, setPref] = useState<ThemePref>(() => {
    if (typeof window === "undefined") return "system";
    return (localStorage.getItem("focoplus-theme") as ThemePref) || "system";
  });

  useEffect(() => {
    applyTheme(pref);
    localStorage.setItem("focoplus-theme", pref);
    if (pref === "system") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const handler = () => applyTheme("system");
      mq.addEventListener("change", handler);
      return () => mq.removeEventListener("change", handler);
    }
  }, [pref]);

  const theme: "light" | "dark" =
    pref === "dark"
      ? "dark"
      : pref === "light"
        ? "light"
        : typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";

  const setTheme = useCallback((p: ThemePref | "light" | "dark") => setPref(p as ThemePref), []);
  const toggle = useCallback(() => setPref((t) => (t === "dark" ? "light" : "dark")), []);

  return { pref, theme, setTheme, toggle };
}
