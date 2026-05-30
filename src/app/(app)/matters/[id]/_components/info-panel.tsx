"use client";

import { useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { matterCategoryLabel, matterStatusLabel } from "@/lib/enums";
import { formatDate, cn } from "@/lib/utils";
import type { MatterPayload, UserOption, FinancePayload } from "./matter-detail-tabs";
import { TeamEditorDialog } from "./team-editor-dialog";
import { AddReminderDialog } from "./add-reminder-dialog";
import { RelatedMattersField } from "./related-matters-field";

export function InfoPanel({
  matter,
  userOptions,
  finance
}: {
  matter: MatterPayload;
  userOptions: UserOption[];
  finance: FinancePayload;
}) {
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const upcomingDeadlines = matter.procedures
    .flatMap((p) =>
      p.deadlines
        .filter((d) => !d.completed)
        .map((d) => ({ ...d, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    .slice(0, 5);

  const upcomingHearings = matter.procedures
    .flatMap((p) =>
      p.hearings
        .filter((h) => new Date(h.startsAt) >= new Date())
        .map((h) => ({ ...h, procedureLabel: p.customLabel ?? p.type }))
    )
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime());

  const sortedMembers = matter.members.slice().sort((a, b) => {
    const order = { LEAD: 0, CO_LEAD: 1, ASSISTANT: 2 } as const;
    return order[a.role] - order[b.role];
  });
  const lead = sortedMembers.find((m) => m.role === "LEAD");
  const others = sortedMembers.filter((m) => m.role !== "LEAD");

  const primaryClientName = matter.primaryClient?.name
    ?? matter.clientLinks.find((cl) => cl.isPrimary)?.client.name
    ?? matter.clientLinks[0]?.client.name
    ?? null;

  // 重要时限及提醒：合并 期限 + 开庭 + 任务（未完成且有 dueAt）
  const upcomingTasks = matter.tasks
    .filter((t) => !t.completed && t.dueAt)
    .map((t) => ({
      kind: "task" as const,
      id: t.id,
      title: t.title,
      date: new Date(t.dueAt!),
      procedureLabel: "提醒"
    }));

  const allEvents = [
    ...upcomingDeadlines.map((d) => ({
      kind: "deadline" as const,
      id: d.id,
      title: d.title,
      date: new Date(d.dueAt),
      procedureLabel: d.procedureLabel
    })),
    ...upcomingHearings.map((h) => ({
      kind: "hearing" as const,
      id: h.id,
      title: h.title,
      date: new Date(h.startsAt),
      procedureLabel: h.procedureLabel
    })),
    ...upcomingTasks
  ].sort((a, b) => a.date.getTime() - b.date.getTime());

  const coLabel =
    others.length === 0
      ? "—"
      : others
          .map((m) => `${m.user.name}（${m.role === "CO_LEAD" ? "协办" : "助理"}）`)
          .join("，");
  // 客户明细
  const client = matter.primaryClient;
  const clientContact = client?.contacts?.[0] ?? null;
  const clientId = client?.idNumber ?? null;
  const clientContactName = clientContact?.name ?? null;
  const clientPhone = clientContact?.phone ?? client?.phone ?? null;

  // 其他案件当事人（相对方 / 第三人）
  const otherParties = matter.parties
    .filter((p) => p.role === "OPPOSING_PARTY" || p.role === "THIRD_PARTY")
    .map((p) => ({
      id: p.id,
      label: p.role === "THIRD_PARTY" ? "第三人" : "相对方",
      name: p.name,
      idNumber:
        p.partyType !== "NATURAL_PERSON" ? p.enterpriseSocialCode : p.idNumber,
      contactName: p.contactName,
      phone: p.phone
    }));

  // 关联案件（双向合并去重）
  const relatedMatters = [
    ...matter.linksFrom.map((l) => l.relatedMatter),
    ...matter.linksTo.map((l) => l.matter)
  ].filter((m, i, arr) => arr.findIndex((x) => x.id === m.id) === i);

  // 财务：开票 / 回款
  const fmtMoney = (n: number) =>
    n ? `¥${n.toLocaleString()}` : "¥0";
  const counterclaim = matter.intake?.counterclaim ?? false;

  return (
    <div className="space-y-4">
      {/* —— 案件信息：全宽，明暗分栏表格，灵活每行多列 —— */}
      <section className="rounded-lg border border-border bg-card">
        <header className="flex items-center justify-between border-b border-border px-4 py-2">
          <span className="text-[13px] font-medium">案件信息</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setTeamEditorOpen(true)}
            className="h-6 gap-1 text-[11px] text-muted-foreground hover:text-primary"
          >
            <Pencil className="h-3 w-3" strokeWidth={1.8} />
            编辑
          </Button>
        </header>
        <div className="overflow-hidden rounded-b-lg">
          {/* 行1：系统编号 | 收案时间 | 案件类型 | 案件名称（更宽）*/}
          <InfoRow>
            <Pair label="系统编号">
              <span className="font-mono tabular">{matter.internalCode}</span>
            </Pair>
            <Pair label="收案时间">{matter.intakeDate ? formatDate(matter.intakeDate) : "—"}</Pair>
            <Pair label="案件类型">{matterCategoryLabel[matter.category]}</Pair>
            <Pair label="案件名称" grow>
              <span className="font-medium">{matter.title || "—"}</span>
            </Pair>
          </InfoRow>
          {/* 行2：案由 | 标的 | 是否反诉 | 案件状态 */}
          <InfoRow>
            <Pair label="案由">{matter.cause?.name ?? matter.causeFreeText ?? "—"}</Pair>
            <Pair label="标的">
              {matter.claimAmount ? (
                <span className="font-mono tabular">
                  ¥{Number(matter.claimAmount).toLocaleString()}
                </span>
              ) : (
                "—"
              )}
            </Pair>
            <Pair label="是否反诉">{counterclaim ? "是" : "否"}</Pair>
            <Pair label="案件状态">
              <span className="inline-flex items-center rounded-sm bg-primary/10 px-1.5 py-0 text-[11px] text-primary">
                {matterStatusLabel[matter.status]}
              </span>
            </Pair>
          </InfoRow>
          {/* 行3：主办律师 | 协办律师/助理 | 开票金额 | 回款金额 */}
          <InfoRow>
            <Pair label="主办律师">{lead ? lead.user.name : "—"}</Pair>
            <Pair label="协办 / 助理">{coLabel}</Pair>
            <Pair label="开票金额">
              <span className="font-mono tabular">{fmtMoney(finance.stats.invoiced)}</span>
            </Pair>
            <Pair label="回款金额">
              <span className="font-mono tabular">{fmtMoney(finance.stats.received)}</span>
            </Pair>
          </InfoRow>
          {/* 行4：客户 | 证件号码 | 联系人 | 联系电话 */}
          <InfoRow>
            <Pair label="客户">{primaryClientName ?? "—"}</Pair>
            <Pair label="证件号码">
              <span className="font-mono tabular">{clientId ?? "—"}</span>
            </Pair>
            <Pair label="联系人">{clientContactName ?? "—"}</Pair>
            <Pair label="联系电话">
              <span className="font-mono tabular">{clientPhone ?? "—"}</span>
            </Pair>
          </InfoRow>
          {/* 行5：其他案件当事人（每人一行）*/}
          {otherParties.map((op) => (
            <InfoRow key={op.id}>
              <Pair label={op.label}>{op.name || "—"}</Pair>
              <Pair label="证件号码">
                <span className="font-mono tabular">{op.idNumber || "—"}</span>
              </Pair>
              <Pair label="联系人">{op.contactName || "—"}</Pair>
              <Pair label="联系电话">
                <span className="font-mono tabular">{op.phone || "—"}</span>
              </Pair>
            </InfoRow>
          ))}
          {/* 行6：关联案件 */}
          <InfoRow>
            <Pair label="关联案件" grow>
              <RelatedMattersField matterId={matter.id} related={relatedMatters} />
            </Pair>
          </InfoRow>
        </div>
      </section>

      {/* —— 重要时限及提醒 —— */}
      <div className="grid grid-cols-1 gap-4">
        <section className="rounded-lg border border-border bg-card">
          <header className="flex items-center justify-between border-b border-border px-4 py-2">
            <span className="text-[13px] font-medium">
              重要时限及提醒
              {allEvents.length > 0 && (
                <span className="ml-1 text-[11px] text-muted-foreground">({allEvents.length})</span>
              )}
            </span>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setReminderOpen(true)}
              className="h-6 gap-1 px-1.5 text-[11px] text-primary"
              title="新建重要时限 / 提醒"
            >
              <Plus className="h-3 w-3" />
              新建
            </Button>
          </header>
          {allEvents.length === 0 ? (
            <p className="py-6 text-center text-[11.5px] text-muted-foreground">
              暂无开庭 / 期限 / 提醒
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {allEvents.slice(0, 6).map((e) => {
                const days = Math.ceil(
                  (e.date.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                );
                const isOverdue = days < 0;
                const isWarn = !isOverdue && days <= 3;
                return (
                  <li key={`${e.kind}-${e.id}`} className="px-3 py-1.5 text-[12px]">
                    <div className="flex items-baseline justify-between gap-2">
                      <span
                        className={cn(
                          "shrink-0 rounded-sm px-1 py-0 text-[9.5px]",
                          e.kind === "hearing"
                            ? "bg-blue-500/10 text-blue-700"
                            : e.kind === "task"
                              ? "bg-primary/10 text-primary"
                              : "bg-amber-500/10 text-amber-700"
                        )}
                      >
                        {e.kind === "hearing" ? "庭" : e.kind === "task" ? "提" : "限"}
                      </span>
                      <span
                        className={cn(
                          "font-mono tabular text-[11px]",
                          isOverdue
                            ? "text-destructive"
                            : isWarn
                              ? "text-amber-500"
                              : "text-muted-foreground"
                        )}
                      >
                        {isOverdue ? `逾期 ${-days}d` : days === 0 ? "今天" : `${days}d`}
                      </span>
                    </div>
                    <div className="mt-0.5 truncate" title={e.title}>{e.title}</div>
                    <div className="font-mono text-[10px] tabular text-muted-foreground">
                      {e.date.toLocaleDateString("zh-CN")} · {e.procedureLabel}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      <TeamEditorDialog
        open={teamEditorOpen}
        onOpenChange={setTeamEditorOpen}
        matterId={matter.id}
        matterMeta={{
          internalCode: matter.internalCode,
          intakeDate: matter.intakeDate ?? null,
          category: matter.category,
          title: matter.title,
          causeId: matter.causeId ?? null,
          causeFreeText: matter.causeFreeText ?? null,
          claimAmount:
            matter.claimAmount === null || matter.claimAmount === undefined
              ? null
              : Number(matter.claimAmount),
          ourStanding: matter.ourStanding ?? null
        }}
        currentOwnerId={matter.ownerId}
        currentMembers={matter.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name
        }))}
        userOptions={userOptions}
      />
      <AddReminderDialog
        open={reminderOpen}
        onOpenChange={setReminderOpen}
        matterId={matter.id}
      />
    </div>
  );
}

/* —— Sub-components —— */

// 一行：移动端纵向堆叠（pair 间横线），md+ 横向排列（pair 间竖线）
function InfoRow({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col divide-y divide-border border-b border-border last:border-b-0 md:flex-row md:divide-x md:divide-y-0">
      {children}
    </div>
  );
}

// 一个标签-取值对：标签灰底（暗），取值白底（亮）
function Pair({
  label,
  grow,
  children
}: {
  label: string;
  grow?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("flex min-w-0", grow ? "md:flex-[2.4]" : "md:flex-1")}>
      <div className="w-[84px] shrink-0 border-r border-border bg-muted/50 px-3 py-2 text-[11.5px] leading-snug text-muted-foreground">
        {label}
      </div>
      <div className="min-w-0 flex-1 break-words bg-card px-3 py-2 text-[12.5px] leading-snug text-foreground/95">
        {children}
      </div>
    </div>
  );
}

