"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { Scale } from "lucide-react";
import { cn } from "@/lib/utils";
import { primaryNav, secondaryNav, type NavItem } from "./nav-config";

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-30 flex h-screen w-60 flex-col",
        "border-r border-hairline bg-card/55 backdrop-blur-xl"
      )}
      style={{ borderRightColor: "hsl(var(--hairline))" }}
    >
      {/* Logo —— editorial */}
      <Link
        href="/"
        className="group flex h-16 items-center gap-2.5 px-5 transition-colors hover:bg-muted/30"
        aria-label="返回仪表盘"
      >
        <div
          className={cn(
            "relative flex h-9 w-9 items-center justify-center",
            "rounded-md bg-primary text-primary-foreground",
            "shadow-ll-low transition-transform group-hover:scale-105"
          )}
        >
          <Scale className="h-4 w-4" strokeWidth={1.5} />
        </div>
        <div className="flex flex-col leading-tight">
          <span className="font-display text-[1.2rem] font-medium tracking-tight">
            LawLink
          </span>
          <span className="text-[10px] text-muted-foreground/80">律师工作台</span>
        </div>
      </Link>

      <div className="ll-rule mx-5" />

      {/* 主导航 */}
      <nav className="flex-1 px-3 py-4">
        <div className="mb-2 px-3 text-[10px] text-muted-foreground/70">导航</div>
        <div className="space-y-0.5">
          {primaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </nav>

      <div className="px-3 pb-4">
        <div className="mb-2 px-3 text-[10px] text-muted-foreground/70">设置</div>
        <div className="space-y-0.5">
          {secondaryNav.map((item) => (
            <NavLink key={item.href} item={item} active={isActive(pathname, item.href)} />
          ))}
        </div>
      </div>
    </aside>
  );
}

function NavLink({ item, active }: { item: NavItem; active: boolean }) {
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      className={cn(
        "group relative flex h-9 items-center gap-2.5 rounded-md px-3 text-[0.85rem] transition-all",
        active
          ? "text-foreground"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {active && (
        <motion.span
          layoutId="active-nav-pill"
          className="absolute inset-0 -z-10 rounded-md bg-muted/70"
          transition={{ type: "spring", stiffness: 380, damping: 30 }}
        />
      )}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-primary"
        />
      )}
      <Icon
        className={cn(
          "h-4 w-4 shrink-0 transition-colors",
          active ? "text-primary" : "text-muted-foreground/80 group-hover:text-foreground"
        )}
        strokeWidth={active ? 2 : 1.6}
      />
      <span className={cn("flex-1 truncate", active && "font-medium")}>
        {item.label}
      </span>
      {item.badge ? (
        <span
          className={cn(
            "rounded-full px-1.5 py-0.5 text-[10px] font-medium tabular",
            active
              ? "bg-primary/15 text-primary"
              : "bg-muted text-muted-foreground"
          )}
        >
          {item.badge}
        </span>
      ) : null}
    </Link>
  );
}

function isActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}
