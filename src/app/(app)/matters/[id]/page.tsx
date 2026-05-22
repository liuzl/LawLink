import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getMatterById } from "@/server/matters/actions";
import { getMatterFinance } from "@/server/finance/actions";
import { getSession } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import { LifecycleActions } from "./_components/lifecycle-actions";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  matterCategoryLabel,
  matterCategoryColor,
  matterStatusLabel,
  litigationStandingLabel
} from "@/lib/enums";
import { formatCurrency, formatDate } from "@/lib/utils";
import { MatterDetailTabs } from "./_components/matter-detail-tabs";

export default async function MatterDetailPage({ params }: { params: { id: string } }) {
  const [matter, session] = await Promise.all([
    getMatterById(params.id),
    getSession()
  ]);
  if (!matter) notFound();

  const [finance, userOptions, notes, documents] = await Promise.all([
    getMatterFinance(matter.id),
    prisma.user.findMany({
      where: { active: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" }
    }),
    prisma.note.findMany({
      where: { matterId: matter.id, deletedAt: null },
      orderBy: { occurredAt: "desc" },
      include: { author: { select: { id: true, name: true } } }
    }),
    prisma.document.findMany({
      where: { matterId: matter.id, deletedAt: null },
      orderBy: { createdAt: "desc" },
      include: {
        uploadedBy: { select: { id: true, name: true } },
        procedure: { select: { id: true, type: true, customLabel: true } }
      }
    })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/matters"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          返回案件列表
        </Link>
      </div>

      <header className="rounded-xl border border-border bg-card/40 p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="font-mono text-xs text-muted-foreground">{matter.internalCode}</div>
              {session?.user && (
                <LifecycleActions
                  matterId={matter.id}
                  status={matter.status}
                  userRole={session.user.role}
                />
              )}
            </div>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight">{matter.title}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <span
                className="inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs"
                style={{
                  borderColor: `${matterCategoryColor[matter.category]}40`,
                  color: matterCategoryColor[matter.category]
                }}
              >
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ backgroundColor: matterCategoryColor[matter.category] }}
                />
                {matterCategoryLabel[matter.category]}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {matterStatusLabel[matter.status]}
              </Badge>
              {matter.ourStanding && (
                <Badge variant="secondary" className="text-[10px]">
                  我方：{litigationStandingLabel[matter.ourStanding]}
                </Badge>
              )}
              {matter.counterclaimAsPlaintiff && (
                <Badge variant="secondary" className="text-[10px]">
                  反诉原告
                </Badge>
              )}
              {matter.counterclaimAsDefendant && (
                <Badge variant="secondary" className="text-[10px]">
                  反诉被告
                </Badge>
              )}
            </div>
          </div>
        </div>

        <Separator className="my-5" />

        <dl className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
          <InfoItem label="案由">
            {matter.cause?.name ?? matter.causeFreeText ?? "—"}
          </InfoItem>
          <InfoItem label="标的金额" mono>
            {matter.claimAmount ? formatCurrency(Number(matter.claimAmount)) : "—"}
          </InfoItem>
          <InfoItem label="收案日期">
            {matter.intakeDate ? formatDate(matter.intakeDate) : "—"}
          </InfoItem>
          <InfoItem label="首次立案">
            {matter.firstAcceptedAt ? formatDate(matter.firstAcceptedAt) : "—"}
          </InfoItem>
        </dl>
      </header>

      <MatterDetailTabs
        matter={matter}
        finance={finance}
        userOptions={userOptions}
        notes={notes}
        documents={documents}
      />
    </div>
  );
}

function InfoItem({
  label,
  mono,
  children
}: {
  label: string;
  mono?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className={`mt-1 ${mono ? "font-mono tabular" : ""}`}>{children}</dd>
    </div>
  );
}
