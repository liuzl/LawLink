"use client";

import Link from "next/link";
import { FileText, Download, Package, ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { cn } from "@/lib/utils";

type DocLite = { id: string; name: string; size: number | null; createdAt: Date };

export type SealContractItem = {
  id: string;
  code: string;
  documentTitle: string;
  status: string;
  createdAt: Date;
  draftDoc: DocLite;
  stampedDoc: DocLite | null;
};

type ContractRow = {
  kind: "intake" | "draft" | "stamped";
  label: string;
  doc: DocLite;
  sealCode?: string;
};

export function ContractsCard({
  intakeContracts,
  sealContracts
}: {
  intakeContracts: DocLite[];
  sealContracts: SealContractItem[];
}) {
  const rows: ContractRow[] = [
    ...intakeContracts.map((d) => ({
      kind: "intake" as const,
      label: "收案时上传",
      doc: d
    })),
    ...sealContracts.flatMap((sr): ContractRow[] => {
      const arr: ContractRow[] = [
        {
          kind: "draft",
          label: "用印申请",
          doc: sr.draftDoc,
          sealCode: sr.code
        }
      ];
      if (sr.stampedDoc) {
        arr.push({
          kind: "stamped",
          label: "盖章后扫描",
          doc: sr.stampedDoc,
          sealCode: sr.code
        });
      }
      return arr;
    })
  ];

  return (
    <section className="ll-surface rounded-lg border border-border p-4">
      <header className="mb-3 flex items-center gap-2">
        <FileText className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        <span className="text-[15px] italic">委托合同 / 附件</span>
        <span className="font-mono text-[11px] text-muted-foreground tabular">
          {rows.length}
        </span>
      </header>
      {rows.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">
          暂无合同或用印附件
        </p>
      ) : (
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li
              key={`${r.kind}-${r.doc.id}`}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              <span
                className={cn(
                  "inline-flex h-7 items-center rounded-sm px-2 text-[10px] font-medium",
                  r.kind === "intake"
                    ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
                    : r.kind === "draft"
                      ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                )}
              >
                {r.label}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.82rem] font-medium">{r.doc.name}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {r.sealCode ? `${r.sealCode} · ` : ""}
                  {r.doc.size ? `${(r.doc.size / 1024).toFixed(0)} KB · ` : ""}
                  {new Date(r.doc.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
              <a
                href={`/api/documents/${r.doc.id}/download`}
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
  );
}

export type ExpressItem = {
  id: string;
  trackingNo: string;
  companyCode: string | null;
  direction: "OUTBOUND" | "INBOUND";
  purpose: string;
  lastState: string | null;
  lastUpdateAt: Date | null;
  createdAt: Date;
};

export function ExpressMiniCard({ expresses }: { expresses: ExpressItem[] }) {
  return (
    <section className="ll-surface rounded-lg border border-border p-4">
      <header className="mb-3 flex items-center gap-2">
        <Package className="h-3.5 w-3.5 text-primary" strokeWidth={1.8} />
        <span className="text-[15px] italic">本案快递</span>
        <span className="font-mono text-[11px] text-muted-foreground tabular">
          {expresses.length}
        </span>
        <Link
          href="/express"
          className="ml-auto text-[11px] text-muted-foreground transition-colors hover:text-primary"
        >
          全部 →
        </Link>
      </header>
      {expresses.length === 0 ? (
        <p className="py-6 text-center text-xs text-muted-foreground">暂无快递记录</p>
      ) : (
        <ul className="space-y-1.5">
          {expresses.slice(0, 6).map((e) => (
            <li
              key={e.id}
              className="flex items-center gap-3 rounded-md border border-border bg-card px-3 py-2"
            >
              {e.direction === "OUTBOUND" ? (
                <ArrowUpFromLine className="h-3.5 w-3.5 shrink-0 text-orange-600" strokeWidth={1.8} />
              ) : (
                <ArrowDownToLine className="h-3.5 w-3.5 shrink-0 text-emerald-600" strokeWidth={1.8} />
              )}
              <div className="min-w-0 flex-1">
                <div className="truncate text-[0.82rem]">{e.purpose}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {e.companyCode ?? "—"} · {e.trackingNo}
                </div>
              </div>
              <div className="text-right">
                <div className="text-[11px] text-foreground/80">{e.lastState ?? "—"}</div>
                <div className="font-mono text-[10px] tabular text-muted-foreground">
                  {e.lastUpdateAt
                    ? new Date(e.lastUpdateAt).toLocaleDateString("zh-CN")
                    : new Date(e.createdAt).toLocaleDateString("zh-CN")}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
