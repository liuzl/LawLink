"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import type { Prisma } from "@prisma/client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Layers,
  Users,
  Clock,
  Info,
  Wallet,
  MessageSquare,
  CheckSquare,
  FileBox
} from "lucide-react";
import { OverviewPanel } from "./overview-panel";
import { PartiesPanel } from "./parties-panel";
import { ProceduresPanel } from "./procedures-panel";
import { TimelinePanel } from "./timeline-panel";
import { FinancePanel } from "./finance-panel";
import { NotesPanel } from "./notes-panel";
import { TasksPanel } from "./tasks-panel";
import { DocumentsPanel, type DocumentPayload } from "./documents-panel";

type MatterPayload = Prisma.MatterGetPayload<{
  include: {
    primaryClient: { include: { contacts: { where: { isPrimary: true }; take: 1 } } };
    clientLinks: { include: { client: { select: { id: true; name: true; type: true } } } };
    owner: { select: { id: true; name: true; role: true } };
    members: { include: { user: { select: { id: true; name: true; role: true } } } };
    cause: true;
    parties: true;
    relatedEntities: true;
    procedures: {
      include: {
        deadlines: true;
        hearings: true;
        stages: true;
      };
    };
    tasks: true;
    timelineEvents: true;
  };
}>;

export type FinancePayload = {
  billings: {
    id: string;
    title: string;
    contractAmount: Prisma.Decimal;
    schedule: string | null;
    status: "DRAFT" | "ACTIVE" | "CLOSED";
    signedAt: Date | null;
    createdAt: Date;
  }[];
  entries: {
    id: string;
    type: "RECEIVABLE" | "RECEIVED" | "REFUND" | "COST" | "COMMISSION";
    amount: Prisma.Decimal;
    occurredAt: Date;
    billingId: string | null;
    invoiceNo: string | null;
    payerOrPayee: string | null;
    method: string | null;
    note: string | null;
    parentFeeEntryId: string | null;
    beneficiaryUserId: string | null;
    beneficiaryUser: { id: string; name: string } | null;
    parentFeeEntry: { id: string; type: string } | null;
  }[];
  plans: {
    id: string;
    userId: string;
    percent: Prisma.Decimal;
    label: string | null;
    active: boolean;
    user: { id: string; name: string; role: string };
  }[];
  stats: {
    contractAmount: number;
    receivable: number;
    received: number;
    refund: number;
    cost: number;
    commission: number;
  };
};

type UserOption = { id: string; name: string; role: string };

export type NotePayload = {
  id: string;
  channel: "PHONE" | "WECHAT" | "EMAIL" | "MEETING" | "COURT" | "OTHER";
  withWhom: string | null;
  occurredAt: Date;
  content: string;
  tags: string[];
  author: { id: string; name: string };
  authorId: string;
  createdAt: Date;
};

export function MatterDetailTabs({
  matter,
  finance,
  userOptions,
  notes,
  documents
}: {
  matter: MatterPayload;
  finance: FinancePayload;
  userOptions: UserOption[];
  notes: NotePayload[];
  documents: DocumentPayload[];
}) {
  const [tab, setTab] = useState("overview");

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
    >
      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="h-10 w-full justify-start gap-1 bg-card/40 p-1">
          <TabsTrigger value="overview" className="gap-1.5">
            <Info className="h-3.5 w-3.5" />
            概览
          </TabsTrigger>
          <TabsTrigger value="procedures" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" />
            程序阶段
            <span className="ml-0.5 font-mono text-[10px] tabular text-muted-foreground">
              {matter.procedures.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="parties" className="gap-1.5">
            <Users className="h-3.5 w-3.5" />
            当事人
            <span className="ml-0.5 font-mono text-[10px] tabular text-muted-foreground">
              {matter.parties.length + matter.clientLinks.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="tasks" className="gap-1.5">
            <CheckSquare className="h-3.5 w-3.5" />
            任务
            <span className="ml-0.5 font-mono text-[10px] tabular text-muted-foreground">
              {matter.tasks.filter((t) => !t.completed).length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="notes" className="gap-1.5">
            <MessageSquare className="h-3.5 w-3.5" />
            沟通
            <span className="ml-0.5 font-mono text-[10px] tabular text-muted-foreground">
              {notes.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="gap-1.5">
            <FileBox className="h-3.5 w-3.5" />
            材料
            <span className="ml-0.5 font-mono text-[10px] tabular text-muted-foreground">
              {documents.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="finance" className="gap-1.5">
            <Wallet className="h-3.5 w-3.5" />
            财务
          </TabsTrigger>
          <TabsTrigger value="timeline" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" />
            时间线
          </TabsTrigger>
        </TabsList>

        <div className="mt-5">
          <TabsContent value="overview" forceMount hidden={tab !== "overview"}>
            <OverviewPanel matter={matter} />
          </TabsContent>
          <TabsContent value="procedures" forceMount hidden={tab !== "procedures"}>
            <ProceduresPanel matter={matter} />
          </TabsContent>
          <TabsContent value="parties" forceMount hidden={tab !== "parties"}>
            <PartiesPanel matter={matter} />
          </TabsContent>
          <TabsContent value="tasks" forceMount hidden={tab !== "tasks"}>
            <TasksPanel
              matterId={matter.id}
              tasks={matter.tasks}
              userOptions={userOptions}
            />
          </TabsContent>
          <TabsContent value="notes" forceMount hidden={tab !== "notes"}>
            <NotesPanel matterId={matter.id} notes={notes} />
          </TabsContent>
          <TabsContent value="documents" forceMount hidden={tab !== "documents"}>
            <DocumentsPanel
              matterId={matter.id}
              documents={documents}
              procedures={matter.procedures.map((p) => ({
                id: p.id,
                label: p.customLabel ?? p.type
              }))}
            />
          </TabsContent>
          <TabsContent value="finance" forceMount hidden={tab !== "finance"}>
            <FinancePanel matterId={matter.id} finance={finance} userOptions={userOptions} />
          </TabsContent>
          <TabsContent value="timeline" forceMount hidden={tab !== "timeline"}>
            <TimelinePanel events={matter.timelineEvents} />
          </TabsContent>
        </div>
      </Tabs>
    </motion.div>
  );
}

export type { MatterPayload, UserOption };
