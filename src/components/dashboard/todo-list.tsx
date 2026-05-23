"use client";

import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { todoItems, type TodoItem } from "@/lib/mock-data";

const severityMeta: Record<
  TodoItem["severity"],
  { dot: string; label: string; tone: string }
> = {
  blocking: {
    dot: "bg-rose-500 ring-rose-500/20",
    label: "阻塞",
    tone: "text-rose-600 dark:text-rose-400"
  },
  urgent: {
    dot: "bg-amber-500 ring-amber-500/20",
    label: "紧急",
    tone: "text-amber-600 dark:text-amber-400"
  },
  normal: {
    dot: "bg-muted-foreground/40 ring-muted-foreground/15",
    label: "普通",
    tone: "text-muted-foreground"
  }
};

export function TodoList() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.35 }}
      className="ll-surface flex h-full flex-col"
    >
      <header className="flex items-center justify-between px-5 pb-3 pt-4">
        <div>
          <h2 className="font-display text-lg italic tracking-tight">待我处理</h2>
        </div>
        <button className="group inline-flex items-center gap-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground">
          全部
          <ArrowRight
            className="h-3 w-3 transition-transform group-hover:translate-x-0.5"
            strokeWidth={1.8}
          />
        </button>
      </header>

      <div className="ll-hairline-t flex-1 overflow-y-auto px-2 py-2">
        {todoItems.map((todo) => {
          const meta = severityMeta[todo.severity];
          return (
            <button
              key={todo.id}
              className="ll-row group flex w-full items-start gap-3 rounded-md px-3 py-2 text-left"
            >
              <span
                className={cn(
                  "mt-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full ring-4",
                  meta.dot
                )}
              />
              <div className="flex-1 overflow-hidden">
                <div className="flex items-center gap-2">
                  <span className={cn("font-eyebrow text-[0.56rem]", meta.tone)}>
                    {meta.label}
                  </span>
                </div>
                <div className="mt-0.5 text-[13px] font-medium leading-tight">
                  {todo.title}
                </div>
                <div className="mt-0.5 font-mono text-[10px] tracking-wide text-muted-foreground tabular">
                  {todo.detail}
                </div>
              </div>
              <ArrowRight
                className="mt-1 h-3 w-3 shrink-0 text-muted-foreground/60 transition-all group-hover:translate-x-0.5 group-hover:text-foreground"
                strokeWidth={1.8}
              />
            </button>
          );
        })}
      </div>
    </motion.section>
  );
}
