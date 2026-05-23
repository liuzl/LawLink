"use client";

import { useEffect, useState } from "react";
import { Sun, Moon, ScrollText } from "lucide-react";
import { useTheme } from "next-themes";

type Mode = "light" | "dark" | "gold";

const ORDER: Mode[] = ["dark", "light", "gold"];

const ICON: Record<Mode, typeof Sun> = {
  light: Sun,
  dark: Moon,
  gold: ScrollText
};

const NEXT_LABEL: Record<Mode, string> = {
  light: "切换深色",
  dark: "切换金 / 米色",
  gold: "切换浅色"
};

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const current: Mode = (mounted ? (resolvedTheme as Mode) : "dark") ?? "dark";
  const Icon = ICON[current];

  function cycle() {
    const next = ORDER[(ORDER.indexOf(current) + 1) % ORDER.length];
    setTheme(next);
  }

  return (
    <button
      type="button"
      aria-label={NEXT_LABEL[current]}
      title={NEXT_LABEL[current]}
      onClick={cycle}
      className="relative flex h-8 w-8 items-center justify-center rounded-md border border-hairline bg-card/40 text-muted-foreground transition-colors hover:border-border hover:bg-card hover:text-foreground"
    >
      <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
    </button>
  );
}
