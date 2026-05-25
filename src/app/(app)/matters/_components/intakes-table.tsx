"use client";

import Link from "next/link";
import { AlertTriangle, Calendar as CalendarIcon, FileText, User, Scale, Building2 } from "lucide-react";
import type { IntakeStatus, ConflictSeverity } from "@prisma/client";
import { matterCategoryLabel, matterCategoryColor, intakeStatusLabel } from "@/lib/enums";
import { cn } from "@/lib/utils";

export type IntakeRow = {
  id: string;
  title: string;
  category: keyof typeof matterCategoryLabel;
  status: IntakeStatus;
  receivedAt: Date;
  client: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  conflictChecks: { id: string; conclusion: string; hits: { severity: ConflictSeverity }[] }[];
  parties: { name: string }[];
  matter: { id: string; internalCode: string } | null;
};

function getHighestSeverity(severities: ConflictSeverity[]): ConflictSeverity | null {
  const order = ["LOW", "MEDIUM", "HIGH", "BLOCKING"] as const;
  let max: ConflictSeverity | null = null;
  for (const s of severities) {
    if (!max || order.indexOf(s) > order.indexOf(max)) max = s;
  }
  return max;
}

/**
 * v0.13: 待审批 / 待补正 收案卡片列表（与 MattersTable 卡片样式保持一致）
 */
export function IntakesTable({
  items,
  kind = "intake"
}: {
  items: IntakeRow[];
  kind?: "intake" | "revision";
}) {
  if (items.length === 0) {
    return (
      <div className="bg-muted/30 border border-border rounded-md flex flex-col items-center gap-2 py-20 text-center">
        <div className="text-base text-muted-foreground">
          {kind === "revision" ? "暂无待补正收案" : "暂无待审批收案"}
        </div>
        <div className="text-xs text-muted-subtle">
          {kind === "revision"
            ? "在 待审批 中拒绝某条收案后，会出现在这里供补正后重新提交"
            : "点击右上角"}{" "}
          {kind === "intake" && <span className="text-foreground/80">新建收案</span>}
        </div>
      </div>
    );
  }
  return (
    <div className="space-y-3">
      {items.map((it) => (
        <IntakeCard key={it.id} intake={it} kind={kind} />
      ))}
    </div>
  );
}

function IntakeCard({
  intake,
  kind
}: {
  intake: IntakeRow;
  kind: "intake" | "revision";
}) {
  const accent = matterCategoryColor[intake.category];
  const sev = intake.conflictChecks[0]
    ? getHighestSeverity(intake.conflictChecks[0].hits.map((h) => h.severity))
    : null;
  return (
    <Link
      href={`/intakes/${intake.id}`}
      className="group block rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-4">
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white sm:h-[52px] sm:w-[52px]"
          style={{ backgroundColor: accent }}
        >
          <Scale className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 space-y-3">
          {/* row 1 */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="truncate text-[16px] font-semibold text-foreground sm:text-[18px]">
                {intake.title || "（未命名）"}
              </span>
            </div>
            <div className="flex items-center justify-end gap-2 text-[12.5px]">
              {sev && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]",
                    sev === "BLOCKING" || sev === "HIGH"
                      ? "border-red-500/30 bg-red-500/10 text-red-700"
                      : "border-amber-500/30 bg-amber-500/10 text-amber-700"
                  )}
                >
                  <AlertTriangle className="h-3 w-3" />
                  冲突 {sev}
                </span>
              )}
              <IntakeStatusPill status={intake.status} kind={kind} />
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* row 2 */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
              <MetaItem icon={<CalendarIcon className="h-3.5 w-3.5" />}>
                <span className="mr-1">咨询</span>
                <span className="text-foreground/80">
                  {new Date(intake.receivedAt).toLocaleDateString("zh-CN")}
                </span>
              </MetaItem>
              <MetaItem icon={<FileText className="h-3.5 w-3.5" />}>
                <span className="mr-1">案由</span>
                <span className="text-foreground/80">{intake.cause?.name ?? "—"}</span>
              </MetaItem>
              <MetaItem icon={<Building2 className="h-3.5 w-3.5" />}>
                <span className="mr-1">类型</span>
                <span className="text-foreground/80">{matterCategoryLabel[intake.category]}</span>
              </MetaItem>
            </div>
            <div className="text-right text-[12.5px]">
              <span className="mr-2 text-muted-foreground">委托人</span>
              <span className="font-medium text-foreground/90">
                {intake.client?.name ?? "—"}
              </span>
            </div>
          </div>

          {/* row 3: 对方（如有） */}
          {intake.parties.length > 0 && (
            <>
              <div className="h-px bg-border" />
              <div className="text-[12.5px]">
                <MetaItem icon={<User className="h-3.5 w-3.5" />}>
                  <span className="mr-1 text-muted-foreground">相对方</span>
                  <span className="text-foreground/90">
                    {intake.parties.map((p) => p.name).join("、")}
                  </span>
                </MetaItem>
              </div>
            </>
          )}
        </div>
      </div>
    </Link>
  );
}

function MetaItem({
  icon,
  children
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-muted-foreground/70">{icon}</span>
      <span>{children}</span>
    </span>
  );
}

function IntakeStatusPill({
  status,
  kind
}: {
  status: IntakeStatus;
  kind: "intake" | "revision";
}) {
  const tone =
    kind === "revision"
      ? "bg-orange-500 text-orange-50"
      : status === "PENDING_CONFIRMATION"
        ? "bg-amber-500 text-amber-50"
        : "bg-emerald-600 text-emerald-50";
  const label = kind === "revision" ? "待补正" : intakeStatusLabel[status] ?? status;
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-3 text-[12px] font-semibold",
        tone
      )}
    >
      {label}
    </span>
  );
}
