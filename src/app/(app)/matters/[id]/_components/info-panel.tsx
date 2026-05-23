"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Users,
  CalendarClock,
  Gavel,
  FileText,
  Download,
  Pencil,
  ArrowUpRight
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  userRoleLabel,
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  litigationStandingLabel
} from "@/lib/enums";
import { formatCurrency, formatDate, cn } from "@/lib/utils";
import type { MatterPayload, UserOption } from "./matter-detail-tabs";
import type { DocumentPayload } from "./documents-panel";
import { TeamEditorDialog } from "./team-editor-dialog";

export function InfoPanel({
  matter,
  intakeContracts,
  userOptions
}: {
  matter: MatterPayload;
  intakeContracts: DocumentPayload[];
  userOptions: UserOption[];
}) {
  const [teamEditorOpen, setTeamEditorOpen] = useState(false);

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
    .sort((a, b) => new Date(a.startsAt).getTime() - new Date(b.startsAt).getTime())
    .slice(0, 3);

  const clientParty = matter.primaryClient;
  const opposing = matter.parties.filter((p) => p.role === "OPPOSING_PARTY");
  const third = matter.parties.filter((p) => p.role === "THIRD_PARTY");

  return (
    <div className="space-y-5">
      {/* editorial 案件头 */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute right-0 top-0 h-32 w-64 -translate-y-1/3 translate-x-1/4 rounded-full opacity-40 blur-3xl"
          style={{ background: matterCategoryColor[matter.category] }}
          aria-hidden
        />

        <div className="relative">
          <div className="font-eyebrow text-[0.58rem] text-muted-foreground">
            Case File
          </div>
          <div className="mt-1 font-mono text-[11px] tracking-widest text-muted-foreground tabular">
            {matter.internalCode}
          </div>
          <h2 className="ll-h2 mt-1.5 max-w-3xl">{matter.title}</h2>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px]"
              style={{
                borderColor: `${matterCategoryColor[matter.category]}55`,
                color: matterCategoryColor[matter.category],
                background: `${matterCategoryColor[matter.category]}0F`
              }}
            >
              <span
                className="h-1 w-1 rounded-full"
                style={{ backgroundColor: matterCategoryColor[matter.category] }}
              />
              {matterCategoryLabel[matter.category]}
            </span>
            <span
              className="rounded-full border px-2.5 py-0.5 text-[11px] text-foreground/80"
              style={{ borderColor: "hsl(var(--border))" }}
            >
              {matterStatusLabel[matter.status]}
            </span>
            {matter.ourStanding && (
              <span className="ll-chip ll-chip-primary text-[11px]">
                我方 · {litigationStandingLabel[matter.ourStanding]}
              </span>
            )}
          </div>
        </div>

        <div className="ll-rule mt-4" />

        <dl className="mt-4 grid grid-cols-2 gap-y-4 md:grid-cols-4">
          <Datum label="Cause of Action / 案由">
            {matter.cause?.name ?? matter.causeFreeText ?? "—"}
          </Datum>
          <Datum label="Claim Amount / 标的">
            {matter.claimAmount ? (
              <span className="font-mono tabular">
                {formatCurrency(Number(matter.claimAmount))}
              </span>
            ) : (
              "—"
            )}
          </Datum>
          <Datum label="Intake Date / 收案日">
            {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
          </Datum>
          <Datum label="First Accepted / 立案日">
            {matter.firstAcceptedAt ? formatDate(matter.firstAcceptedAt) : "—"}
          </Datum>
        </dl>
      </section>

      {/* 主区两列 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* 左 */}
        <div className="space-y-4 lg:col-span-8">
          {/* 当事人 */}
          <section className="ll-surface p-5">
            <CardHeader eyebrow="Parties" title="当事人" icon={Users} />
            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-3">
              <PartyColumn title="委托方" color="#5B8DEF">
                {clientParty ? (
                  <PartyCard
                    name={clientParty.name}
                    sub={
                      matter.ourStanding ? litigationStandingLabel[matter.ourStanding] : undefined
                    }
                    href={`/clients/${clientParty.id}`}
                  />
                ) : (
                  <Empty />
                )}
              </PartyColumn>
              <PartyColumn title="对方" color="#EA580C">
                {opposing.length === 0 ? (
                  <Empty />
                ) : (
                  opposing.map((p) => (
                    <PartyCard
                      key={p.id}
                      name={p.name}
                      sub={
                        p.standing ? litigationStandingLabel[p.standing] : p.idNumber ?? undefined
                      }
                    />
                  ))
                )}
              </PartyColumn>
              <PartyColumn title="第三人" color="#9B7BF7">
                {third.length === 0 ? (
                  <Empty />
                ) : (
                  third.map((p) => (
                    <PartyCard
                      key={p.id}
                      name={p.name}
                      sub={
                        p.standing ? litigationStandingLabel[p.standing] : p.idNumber ?? undefined
                      }
                    />
                  ))
                )}
              </PartyColumn>
            </div>
          </section>

          {/* 近期期限 */}
          <section className="ll-surface p-5">
            <CardHeader eyebrow="Upcoming Deadlines" title="近期期限" icon={CalendarClock} />
            {upcomingDeadlines.length === 0 ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                暂无未完成的期限
              </p>
            ) : (
              <ul className="mt-3 -mx-2">
                {upcomingDeadlines.map((d) => {
                  const days = Math.ceil(
                    (new Date(d.dueAt).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
                  );
                  const isOverdue = days < 0;
                  const isWarn = !isOverdue && days <= 3;
                  return (
                    <li
                      key={d.id}
                      className="ll-row flex items-center justify-between gap-3 rounded-md px-2 py-2"
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="truncate text-[0.875rem] font-medium">{d.title}</div>
                        <div className="mt-0.5 text-[11px] text-muted-foreground">
                          {d.procedureLabel}
                        </div>
                      </div>
                      <div className="text-right">
                        <div
                          className={cn(
                            "font-mono text-sm tabular",
                            isOverdue
                              ? "text-destructive"
                              : isWarn
                                ? "text-amber-500 dark:text-amber-400"
                                : "text-foreground"
                          )}
                        >
                          {isOverdue
                            ? `逾期 ${-days}d`
                            : days === 0
                              ? "今天"
                              : `${days}d`}
                        </div>
                        <div className="font-mono text-[10px] tabular text-muted-foreground">
                          {new Date(d.dueAt).toLocaleDateString("zh-CN")}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* 近期开庭 */}
          <section className="ll-surface p-5">
            <CardHeader eyebrow="Upcoming Hearings" title="近期开庭" icon={Gavel} />
            {upcomingHearings.length === 0 ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">暂无</p>
            ) : (
              <ul className="mt-3 -mx-2">
                {upcomingHearings.map((h) => (
                  <li key={h.id} className="ll-row rounded-md px-2 py-2">
                    <div className="text-[0.875rem] font-medium">{h.title}</div>
                    <div className="mt-1 font-mono text-[11px] text-muted-foreground tabular">
                      {new Date(h.startsAt).toLocaleString("zh-CN", {
                        month: "long",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit"
                      })}
                      <span className="ml-2 text-muted-subtle">· {h.procedureLabel}</span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* 右 */}
        <div className="space-y-4 lg:col-span-4">
          {/* 团队 */}
          <section className="ll-surface p-6">
            <CardHeader
              eyebrow="Counsel"
              title="团队"
              icon={Users}
              action={
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setTeamEditorOpen(true)}
                  className="h-7 gap-1 text-primary"
                >
                  <Pencil className="h-3 w-3" strokeWidth={1.8} />
                  编辑
                </Button>
              }
            />
            <ul className="mt-3 space-y-2">
              {matter.members
                .slice()
                .sort((a, b) => {
                  const order = { LEAD: 0, CO_LEAD: 1, ASSISTANT: 2 } as const;
                  return order[a.role] - order[b.role];
                })
                .map((m) => (
                  <li key={m.userId} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div
                        className={cn(
                          "flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-medium",
                          m.role === "LEAD"
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground/70"
                        )}
                      >
                        {m.user.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-[0.875rem] font-medium">{m.user.name}</div>
                        <div className="text-[10.5px] text-muted-foreground">
                          {userRoleLabel[m.user.role]}
                        </div>
                      </div>
                    </div>
                    <span
                      className={cn(
                        "font-eyebrow text-[0.58rem]",
                        m.role === "LEAD" ? "text-primary" : "text-muted-foreground"
                      )}
                    >
                      {m.role === "LEAD" ? "主办" : m.role === "CO_LEAD" ? "协办" : "助理"}
                    </span>
                  </li>
                ))}
            </ul>
          </section>

          {/* 委托合同 */}
          <section className="ll-surface p-6">
            <CardHeader eyebrow="Engagement" title="委托合同" icon={FileText} />
            {intakeContracts.length === 0 ? (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                收案时未上传委托合同
              </p>
            ) : (
              <ul className="mt-3 space-y-2">
                {intakeContracts.map((d) => (
                  <li
                    key={d.id}
                    className="group flex items-center gap-3 rounded-md border border-hairline bg-card/30 px-3 py-2.5 transition-colors hover:border-border"
                    style={{ borderColor: "hsl(var(--hairline))" }}
                  >
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                      <FileText className="h-4 w-4" strokeWidth={1.6} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <div className="truncate text-[0.82rem] font-medium">{d.name}</div>
                      <div className="font-mono text-[10px] tabular text-muted-foreground">
                        {d.size ? `${(d.size / 1024).toFixed(0)} KB` : ""} ·{" "}
                        {new Date(d.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${d.id}/download`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-muted-foreground transition-colors hover:text-primary"
                      aria-label="下载"
                    >
                      <Download className="h-4 w-4" strokeWidth={1.6} />
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* 财务入口提示 */}
          <Link
            href={`/matters/${matter.id}#resources`}
            className={cn(
              "group flex items-center justify-between rounded-lg border px-5 py-4 text-sm transition-colors",
              "border-primary/25 bg-primary/5 hover:bg-primary/10"
            )}
          >
            <span className="text-foreground/85">
              财务流水与开票申请<span className="text-muted-subtle"> · 案件资料</span>
            </span>
            <ArrowUpRight
              className="h-4 w-4 text-primary transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5"
              strokeWidth={1.8}
            />
          </Link>
        </div>
      </div>

      <TeamEditorDialog
        open={teamEditorOpen}
        onOpenChange={setTeamEditorOpen}
        matterId={matter.id}
        currentOwnerId={matter.ownerId}
        currentMembers={matter.members.map((m) => ({
          userId: m.userId,
          role: m.role,
          name: m.user.name
        }))}
        userOptions={userOptions}
      />
    </div>
  );
}

/* —— Sub-components —— */

function Datum({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-eyebrow text-[0.58rem] text-muted-foreground">{label}</div>
      <div className="mt-2 text-[0.92rem] text-foreground">{children}</div>
    </div>
  );
}

function CardHeader({
  eyebrow,
  title,
  icon: Icon,
  action
}: {
  eyebrow: string;
  title: string;
  icon: typeof Users;
  action?: React.ReactNode;
}) {
  return (
    <header className="flex items-end justify-between">
      <div>
        <div className="flex items-center gap-2">
          <Icon className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
          <span className="font-eyebrow text-[0.58rem] text-muted-foreground">
            {eyebrow}
          </span>
        </div>
        <div className="mt-0.5 font-display text-[1rem] tracking-tight">{title}</div>
      </div>
      {action}
    </header>
  );
}

function PartyColumn({
  title,
  color,
  children
}: {
  title: string;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <div className="mb-2 flex items-center gap-2">
        <span
          className="h-2 w-2 rounded-full"
          style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}80` }}
        />
        <span className="font-eyebrow text-[0.58rem] text-muted-foreground">
          {title}
        </span>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  );
}

function PartyCard({
  name,
  sub,
  href
}: {
  name: string;
  sub?: string;
  href?: string;
}) {
  const inner = (
    <div
      className="rounded-md border bg-card/40 px-3.5 py-2.5 transition-colors hover:border-border"
      style={{ borderColor: "hsl(var(--hairline))" }}
    >
      <div className="truncate text-[0.875rem] font-medium">{name}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
  return href ? (
    <Link href={href} className="block transition-opacity hover:opacity-90">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function Empty() {
  return (
    <div
      className="rounded-md border border-dashed py-3 text-center text-[11px] text-muted-foreground"
      style={{ borderColor: "hsl(var(--hairline))" }}
    >
      —
    </div>
  );
}
