"use client";

import Link from "next/link";
import type { Matter, PartyRole, LitigationStanding, Prisma } from "@prisma/client";
import { Badge } from "@/components/ui/badge";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  procedureTypeLabel,
  litigationStandingLabel
} from "@/lib/enums";
import { formatCurrency } from "@/lib/utils";

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

export function MattersGrid({ items }: { items: MatterRow[] }) {
  if (items.length === 0) {
    return (
      <div className="ll-surface-quiet flex flex-col items-center gap-2 py-20 text-center">
        <div className="font-display text-base text-muted-foreground">没有匹配的案件</div>
        <div className="text-xs text-muted-subtle">
          点击右上角 <span className="text-foreground/80">新建收案</span> 开始
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {items.map((m) => (
        <MatterCard key={m.id} m={m} />
      ))}
    </div>
  );
}

function MatterCard({ m }: { m: MatterRow }) {
  const current = m.procedures[0];
  const opposing = m.parties.filter((p) => p.role === "OPPOSING_PARTY");
  const third = m.parties.filter((p) => p.role === "THIRD_PARTY");
  const categoryColor = matterCategoryColor[m.category];
  const causeText = m.cause?.name ?? m.causeFreeText ?? "—";

  return (
    <Link
      href={`/matters/${m.id}`}
      className="group ll-surface flex flex-col gap-2 rounded-lg border border-hairline p-4 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
    >
      {/* 行 1：编号 + 类别 + 状态 + 主办 */}
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-mono text-muted-foreground">{m.internalCode}</span>
        <span
          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5"
          style={{ background: `${categoryColor}14`, color: categoryColor }}
        >
          <span className="h-1 w-1 rounded-full" style={{ background: categoryColor }} />
          {matterCategoryLabel[m.category]}
        </span>
        <Badge
          variant="outline"
          className="border-hairline px-1.5 py-0 text-[10px] font-normal"
          style={{ borderColor: "hsl(var(--hairline))" }}
        >
          {matterStatusLabel[m.status]}
        </Badge>
        {m.owner && (
          <span className="ml-auto truncate text-[11px] text-muted-foreground">
            {m.owner.name}
          </span>
        )}
      </div>

      {/* 行 2：案件名 + 案由 */}
      <div className="space-y-0.5">
        <h3 className="line-clamp-1 font-display text-[1.05rem] italic leading-snug text-foreground transition-colors group-hover:text-primary">
          {m.title}
        </h3>
        <p className="line-clamp-1 text-[12px] text-muted-foreground">{causeText}</p>
      </div>

      {/* 行 3：当事人 / 收案日 / 标的 / 程序 */}
      <div className="mt-1 space-y-1 border-t border-hairline pt-2 text-[11px] text-muted-foreground">
        <PartyRow
          label="委托方"
          accent="#5B8DEF"
          text={m.primaryClient?.name ?? "—"}
        />
        {opposing.length > 0 && (
          <PartyRow
            label="对方"
            accent="#FB923C"
            text={opposing
              .map((p) => `${p.name}${p.standing ? `（${litigationStandingLabel[p.standing]}）` : ""}`)
              .join("、")}
          />
        )}
        {third.length > 0 && (
          <PartyRow
            label="第三人"
            accent="#9B7BF7"
            text={third.map((p) => p.name).join("、")}
          />
        )}
      </div>

      {/* 行 4：底部小字 */}
      <div className="mt-auto flex items-center gap-2 pt-1 font-mono text-[10px] text-muted-foreground">
        {m.intakeDate && <span>收案 {new Date(m.intakeDate).toLocaleDateString("zh-CN")}</span>}
        {m.claimAmount && (
          <>
            <span>·</span>
            <span>标的 {formatCurrency(Number(m.claimAmount), { compact: true })}</span>
          </>
        )}
        {current && (
          <span className="ml-auto truncate">
            {procedureTypeLabel[current.type as keyof typeof procedureTypeLabel]}
            {current.caseNumber && (
              <span className="ml-1 text-muted-foreground/70">{current.caseNumber}</span>
            )}
          </span>
        )}
      </div>
    </Link>
  );
}

function PartyRow({ label, accent, text }: { label: string; accent: string; text: string }) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="inline-flex items-center gap-1 shrink-0 text-muted-foreground/70">
        <span className="h-1 w-1 rounded-full" style={{ background: accent }} />
        {label}
      </span>
      <span className="line-clamp-1 text-foreground/85">{text}</span>
    </div>
  );
}
