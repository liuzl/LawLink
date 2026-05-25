"use client";

import Link from "next/link";
import type { Matter, PartyRole, LitigationStanding, Prisma } from "@prisma/client";
import {
  Calendar as CalendarIcon,
  FileText as FileTextIcon,
  Building2,
  User,
  Banknote,
  Scale
} from "lucide-react";
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
  _count: { procedures: number };
  claimAmount: Prisma.Decimal | null;
  intakeDate: Date | null;
};

/**
 * v0.13: 案件列表卡片样式（参考用户提供的 case-list-single-card-style.html）
 * 三行布局：
 * - 第一行：标题 + 系统编号 | 主办律师
 * - 第二行：收案时间 / 案由 / 管辖机构 | 代理程序
 * - 第三行：我方客户/地位 / 标的额 | 案件状态 pill
 */
export function MattersTable({ items }: { items: MatterRow[] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-md border border-border bg-muted/30 flex flex-col items-center gap-2 py-20 text-center">
        <div className="text-base text-muted-foreground">没有匹配的案件</div>
        <div className="text-xs text-muted-subtle">
          点击右上角 <span className="text-foreground/80">新建收案</span> 开始
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {items.map((m) => (
        <MatterCard key={m.id} matter={m} />
      ))}
    </div>
  );
}

function MatterCard({ matter }: { matter: MatterRow }) {
  const firstProc = matter.procedures[0];
  const procLabel = firstProc
    ? procedureTypeLabel[firstProc.type as keyof typeof procedureTypeLabel] ?? firstProc.type
    : "—";
  const caseNumber = firstProc?.caseNumber ?? null;
  const ourSide = matter.parties.find((p) => p.role === "CLIENT_PARTY");
  const ourStanding = (matter.ourStanding ?? ourSide?.standing) as LitigationStanding | null;
  const standingLabel = ourStanding ? litigationStandingLabel[ourStanding] : null;
  const accent = matterCategoryColor[matter.category];

  return (
    <Link
      href={`/matters/${matter.id}`}
      className="group block rounded-lg border border-border bg-card p-4 shadow-sm transition-shadow hover:shadow-md sm:p-5"
    >
      <div className="grid grid-cols-[44px_minmax(0,1fr)] gap-3 sm:grid-cols-[52px_minmax(0,1fr)] sm:gap-4">
        {/* 图标 */}
        <div
          className="flex h-11 w-11 items-center justify-center rounded-xl text-white sm:h-[52px] sm:w-[52px]"
          style={{ backgroundColor: accent }}
        >
          <Scale className="h-5 w-5" strokeWidth={2} />
        </div>

        <div className="min-w-0 space-y-3">
          {/* row 1：标题 + 系统编号 | 主办律师 */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6">
            <div className="flex min-w-0 items-baseline gap-3">
              <span className="truncate text-[16px] font-semibold text-foreground sm:text-[18px]">
                {matter.title}
              </span>
              <span className="shrink-0 font-mono text-[12px] text-muted-foreground">
                {matter.internalCode}
              </span>
            </div>
            <div className="text-right text-[12.5px]">
              <span className="mr-2 text-muted-foreground">主办律师</span>
              {matter.owner ? (
                <span className="inline-flex items-center gap-1.5">
                  <span
                    className="inline-grid h-6 w-6 place-items-center rounded-full text-[11px] font-bold"
                    style={{ background: `${accent}15`, color: accent }}
                  >
                    {matter.owner.name.charAt(0)}
                  </span>
                  <span className="font-medium text-foreground/90">{matter.owner.name}</span>
                </span>
              ) : (
                <span className="text-muted-foreground">—</span>
              )}
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* row 2：meta + 代理程序 */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-muted-foreground">
              <MetaItem icon={<CalendarIcon className="h-3.5 w-3.5" />}>
                <span className="mr-1">收案</span>
                <span className="text-foreground/80">
                  {matter.intakeDate
                    ? new Date(matter.intakeDate).toLocaleDateString("zh-CN")
                    : "—"}
                </span>
              </MetaItem>
              <MetaItem icon={<FileTextIcon className="h-3.5 w-3.5" />}>
                <span className="mr-1">案由</span>
                <span className="text-foreground/80">
                  {matter.cause?.name ?? matter.causeFreeText ?? "—"}
                </span>
              </MetaItem>
              <MetaItem icon={<Building2 className="h-3.5 w-3.5" />}>
                <span className="mr-1">类型</span>
                <span className="text-foreground/80">
                  {matterCategoryLabel[matter.category]}
                </span>
              </MetaItem>
            </div>
            <div className="text-right text-[12.5px]">
              <span className="mr-2 text-muted-foreground">代理程序</span>
              <span className="font-medium text-foreground/90">{procLabel}</span>
            </div>
          </div>

          <div className="h-px bg-border" />

          {/* row 3：客户/标的 + 状态 */}
          <div className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[minmax(0,1fr)_220px] sm:gap-6">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px]">
              <MetaItem icon={<User className="h-3.5 w-3.5" />}>
                <span className="mr-1 text-muted-foreground">委托人 / 地位</span>
                <span className="text-foreground/90">
                  {matter.primaryClient?.name ?? "—"}
                  {standingLabel ? `，${standingLabel}` : ""}
                </span>
              </MetaItem>
              <MetaItem icon={<Banknote className="h-3.5 w-3.5" />}>
                <span className="mr-1 text-muted-foreground">标的额</span>
                <span className="font-mono text-[13px] font-semibold text-foreground tabular">
                  {matter.claimAmount
                    ? `¥${formatCurrency(Number(matter.claimAmount), { compact: true })}`
                    : "—"}
                </span>
              </MetaItem>
            </div>
            <div className="flex items-center justify-end gap-2 text-[12.5px]">
              <span className="text-muted-foreground">状态</span>
              <StatusPill status={matter.status} />
            </div>
          </div>
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

function StatusPill({ status }: { status: MatterRow["status"] }) {
  const map: Record<MatterRow["status"], string> = {
    PENDING_ACCEPTANCE: "bg-amber-500 text-amber-50",
    IN_PROGRESS: "bg-emerald-600 text-emerald-50",
    ON_HOLD: "bg-slate-500 text-slate-50",
    CLOSED: "bg-blue-600 text-blue-50",
    ARCHIVED: "bg-purple-600 text-purple-50"
  };
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-full px-3 text-[12px] font-semibold",
        map[status]
      )}
    >
      {matterStatusLabel[status]}
    </span>
  );
}
