"use client";

import { useState } from "react";
import { CheckSquare, MessageSquare, FileBox, Wallet } from "lucide-react";
import { cn } from "@/lib/utils";
import { TasksPanel } from "./tasks-panel";
import { NotesPanel } from "./notes-panel";
import { DocumentsPanel, type DocumentPayload } from "./documents-panel";
import { FinancePanel } from "./finance-panel";
import { InvoiceSection } from "./invoice-section";
import type {
  MatterPayload,
  UserOption,
  FinancePayload,
  NotePayload
} from "./matter-detail-tabs";

type SubTab = "tasks" | "notes" | "documents" | "finance";

const SUB_TABS: { key: SubTab; label: string; icon: typeof CheckSquare }[] = [
  { key: "tasks", label: "任务", icon: CheckSquare },
  { key: "notes", label: "沟通", icon: MessageSquare },
  { key: "documents", label: "材料", icon: FileBox },
  { key: "finance", label: "财务", icon: Wallet }
];

export function ResourcesPanel({
  matter,
  notes,
  documents,
  finance,
  userOptions
}: {
  matter: MatterPayload;
  notes: NotePayload[];
  documents: DocumentPayload[];
  finance: FinancePayload;
  userOptions: UserOption[];
}) {
  const [sub, setSub] = useState<SubTab>("tasks");

  return (
    <div className="space-y-4">
      {/* 子 tab */}
      <div
        className="flex items-end gap-5 border-b"
        style={{ borderColor: "hsl(var(--hairline))" }}
      >
        {SUB_TABS.map((t) => {
          const Icon = t.icon;
          const active = t.key === sub;
          let count: number | null = null;
          if (t.key === "tasks") count = matter.tasks.filter((x) => !x.completed).length;
          else if (t.key === "notes") count = notes.length;
          else if (t.key === "documents") count = documents.length;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setSub(t.key)}
              className={cn(
                "relative inline-flex items-center gap-1.5 pb-2.5 pt-0.5 text-[13px] transition-colors",
                active
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <Icon className="h-3.5 w-3.5" strokeWidth={1.8} />
              {t.label}
              {count !== null && count > 0 && (
                <span className="font-mono text-[10px] tabular text-muted-foreground">
                  {count}
                </span>
              )}
              {active && (
                <span
                  aria-hidden
                  className="absolute -bottom-px left-0 right-0 h-[2px] bg-primary"
                />
              )}
            </button>
          );
        })}
      </div>

      {sub === "tasks" && (
        <TasksPanel matterId={matter.id} tasks={matter.tasks} userOptions={userOptions} />
      )}
      {sub === "notes" && <NotesPanel matterId={matter.id} notes={notes} />}
      {sub === "documents" && (
        <DocumentsPanel
          matterId={matter.id}
          documents={documents}
          procedures={matter.procedures.map((p) => ({
            id: p.id,
            label: p.customLabel ?? p.type
          }))}
        />
      )}
      {sub === "finance" && (
        <div className="space-y-4">
          <FinancePanel matterId={matter.id} finance={finance} userOptions={userOptions} />
          <InvoiceSection matterId={matter.id} />
        </div>
      )}
    </div>
  );
}
