"use client";

import Link from "next/link";
import type { Matter, PartyRole, LitigationStanding, Prisma } from "@prisma/client";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  procedureTypeLabel,
  litigationStandingLabel
} from "@/lib/enums";
import { formatCurrency, cn } from "@/lib/utils";

export type MatterRow = Matter & {
  primaryClient: { id: string; name: string } | null;
  owner: { id: string; name: string } | null;
  cause: { id: string; name: string } | null;
  procedures: { id: string; type: string; caseNumber: string | null; status: string }[];
  parties: { id: string; name: string; role: PartyRole; standing: LitigationStanding | null }[];
  archiveRecords?: { id: string }[];
  _count: { procedures: number };
  claimAmount: Prisma.Decimal | null;
  intakeDate: Date | null;
};

/**
 * v0.17: 案件列表卡片 - 视觉收敛
 * - 字号 2 档（15px 标题 / 12.5px meta）
 * - 颜色：仅左侧 3px 竖条按类别染色；状态用同一灰底 chip + 点
 * - label 统一灰色，无各种 dot 颜色
 * - 编号移到行 2（不再首屏粗暴展示）
 */
export function MattersTable({ items }: { items: MatterRow[] }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-md border border-border bg-card py-20 text-center">
        <div className="text-base text-muted-foreground">没有匹配的案件</div>
        <div className="text-xs text-muted-foreground/70">
          点击右上角 <span className="text-foreground/80">新建收案</span> 开始
        </div>
      </div>
    );
  }

  return (
    <ul className="space-y-2.5">
      {items.map((m) => (
        <MatterListRow key={m.id} m={m} />
      ))}
    </ul>
  );
}

function MatterListRow({ m }: { m: MatterRow }) {
  const current = m.procedures[0];
  const opposing = m.parties.filter((p) => p.role === "OPPOSING_PARTY");
  const third = m.parties.filter((p) => p.role === "THIRD_PARTY");
  const categoryColor = matterCategoryColor[m.category];
  const causeText = m.cause?.name ?? m.causeFreeText ?? null;
  const procLabel = current
    ? procedureTypeLabel[current.type as keyof typeof procedureTypeLabel] ?? current.type
    : null;
  const hasPendingArchive = (m.archiveRecords?.length ?? 0) > 0;

  return (
    <li>
      <Link
        href={`/matters/${m.id}`}
        className="group relative block overflow-hidden rounded-lg border border-border bg-card py-4 pl-5 pr-5 transition-colors hover:border-foreground/30"
      >
        {/* 左侧 3px category accent 竖条 - 唯一彩色装饰 */}
        <span
          aria-hidden
          className="absolute left-0 top-0 h-full w-[3px]"
          style={{ background: categoryColor }}
        />

        {/* 行 1：标题 + 状态 chip + 右侧主办 */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <span className="text-[15px] font-medium text-foreground transition-colors group-hover:text-primary">
            {m.title}
          </span>
          <StatusChip status={m.status} pendingArchive={hasPendingArchive} />

          <div className="ml-auto flex items-center gap-1.5 text-[12.5px] text-muted-foreground">
            <span>主办</span>
            {m.owner ? (
              <>
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10.5px] font-medium text-foreground/70">
                  {m.owner.name.charAt(0)}
                </span>
                <span className="text-foreground/80">{m.owner.name}</span>
              </>
            ) : (
              <span>—</span>
            )}
          </div>
        </div>

        {/* 行 2：所有 meta — 统一字号 / label 统一 muted / 仅 mono 字体区分数据 */}
        <div className="mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-[12.5px] text-muted-foreground">
          <Field label="编号">
            <span className="font-mono">{m.internalCode}</span>
          </Field>
          <Field label="类型">{matterCategoryLabel[m.category]}</Field>
          <Field label="委托">{m.primaryClient?.name ?? "—"}</Field>
          {opposing.length > 0 && (
            <Field label="对方">
              {opposing
                .map(
                  (p) =>
                    `${p.name}${p.standing ? `（${litigationStandingLabel[p.standing]}）` : ""}`
                )
                .join("、")}
            </Field>
          )}
          {third.length > 0 && (
            <Field label="第三人">{third.map((p) => p.name).join("、")}</Field>
          )}
          {causeText && <Field label="案由">{causeText}</Field>}
          {procLabel && (
            <Field label="程序">
              {procLabel}
              {current?.caseNumber && (
                <span className="ml-1.5 font-mono text-muted-foreground">
                  {current.caseNumber}
                </span>
              )}
            </Field>
          )}
          {m.intakeDate && (
            <Field label="收案">
              <span className="font-mono">
                {new Date(m.intakeDate).toLocaleDateString("zh-CN")}
              </span>
            </Field>
          )}
          {m.claimAmount && (
            <Field label="标的">
              <span className="font-mono text-foreground/85">
                {formatCurrency(Number(m.claimAmount), { compact: true })}
              </span>
            </Field>
          )}
        </div>
      </Link>
    </li>
  );
}

function Field({
  label,
  children
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="text-[11px] text-muted-foreground/70">{label}</span>
      <span className="text-foreground/90">{children}</span>
    </span>
  );
}

function StatusChip({
  status,
  pendingArchive
}: {
  status: MatterRow["status"];
  pendingArchive: boolean;
}) {
  // v0.17: 状态 chip 统一灰底 + dot 颜色区分（仅用 5 个 dot 色）
  const dotColor: Record<MatterRow["status"], string> = {
    PENDING_ACCEPTANCE: "#f59e0b", // amber
    IN_PROGRESS: "#10b981", // emerald
    ON_HOLD: "#94a3b8", // slate
    CLOSED: "#3b82f6", // blue
    ARCHIVED: "#8b5cf6" // purple
  };
  const label = pendingArchive ? "归档中" : matterStatusLabel[status];
  const dot = pendingArchive ? "#8b5cf6" : dotColor[status];
  return (
    <span
      className={cn(
        "inline-flex h-5 items-center gap-1.5 rounded-full border border-border bg-muted/60 px-2 text-[11px] text-foreground/75"
      )}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ background: dot }} />
      {label}
    </span>
  );
}
