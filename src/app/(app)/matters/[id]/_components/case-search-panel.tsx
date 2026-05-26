"use client";

import { useState, useTransition } from "react";
import {
  Search,
  Loader2,
  ExternalLink,
  Scale,
  CircleAlert
} from "lucide-react";
import { toast } from "sonner";
import type { MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  searchSimilarCases,
  type CaseSearchHit
} from "@/server/yuandian/cases";
import { cn } from "@/lib/utils";

type Props = {
  matterId: string;
  matterCategory: MatterCategory;
  defaultCauseName: string | null;
};

const PROVINCES = [
  "北京", "天津", "河北", "山西", "内蒙古", "辽宁", "吉林", "黑龙江",
  "上海", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南",
  "湖北", "湖南", "广东", "广西", "海南", "重庆", "四川", "贵州",
  "云南", "西藏", "陕西", "甘肃", "青海", "宁夏", "新疆", "最高"
];

const WSZL_OPTIONS = ["判决书", "裁定书", "调解书", "决定书"] as const;

function ajlbFromCategory(cat: MatterCategory): string | undefined {
  switch (cat) {
    case "CIVIL_COMMERCIAL":
      return "民事案件";
    case "CRIMINAL":
      return "刑事案件";
    case "ADMINISTRATIVE":
      return "行政案件";
    default:
      return undefined;
  }
}

export function CaseSearchPanel({ matterId, matterCategory, defaultCauseName }: Props) {
  const [causeInput, setCauseInput] = useState(defaultCauseName ?? "");
  const [qw, setQw] = useState("");
  const [provinces, setProvinces] = useState<string[]>([]);
  const [wszl, setWszl] = useState<string[]>(["判决书"]);
  const [jaStart, setJaStart] = useState("");
  const [jaEnd, setJaEnd] = useState("");
  const [topK, setTopK] = useState(10);

  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{
    total: number;
    items: CaseSearchHit[];
    pointsCharged: number;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggleProvince(p: string) {
    setProvinces((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));
  }
  function toggleWszl(w: string) {
    setWszl((prev) => (prev.includes(w) ? prev.filter((x) => x !== w) : [...prev, w]));
  }

  function handleSearch() {
    const ay = causeInput
      .split(/[,，、\s]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setError(null);
    startTransition(async () => {
      try {
        const r = await searchSimilarCases({
          matterId,
          ay: ay.length ? ay : undefined,
          ajlb: ajlbFromCategory(matterCategory) as never,
          xzqh_p: provinces.length ? provinces : undefined,
          wszl: wszl.length ? (wszl as never) : undefined,
          qw: qw.trim() || undefined,
          ja_start: jaStart || undefined,
          ja_end: jaEnd || undefined,
          top_k: topK
        });
        setResult(r);
        if (r.items.length === 0) {
          toast.info("未命中类案");
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : "检索失败";
        setError(msg);
        toast.error("检索失败", { description: msg });
      }
    });
  }

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <div>
          <h3 className="flex items-center gap-2 text-base">
            <Scale className="h-4 w-4 text-primary" strokeWidth={1.8} />
            类案检索
          </h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            元典普通案例库 · 每次检索扣 10 POINT
          </p>
        </div>
      </header>

      {/* 检索表单 */}
      <div className="space-y-3 rounded-lg border border-border bg-card p-4">
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <Label className="text-[11px]">案由（多个用 / 逗号分隔）</Label>
            <Input
              value={causeInput}
              onChange={(e) => setCauseInput(e.target.value)}
              placeholder="如：民间借贷纠纷"
              className="mt-1"
            />
          </div>
          <div>
            <Label className="text-[11px]">全文关键词（空格 AND 拼接）</Label>
            <Input
              value={qw}
              onChange={(e) => setQw(e.target.value)}
              placeholder="如：违约金 逾期"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label className="text-[11px]">省级法院（多选）</Label>
          <div className="mt-1.5 flex flex-wrap gap-1">
            {PROVINCES.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => toggleProvince(p)}
                className={cn(
                  "rounded-full border px-2 py-0.5 text-[11px] transition-colors",
                  provinces.includes(p)
                    ? "border-primary bg-primary/15 text-primary"
                    : "border-border bg-background text-muted-foreground hover:border-input"
                )}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <div>
            <Label className="text-[11px]">文书种类</Label>
            <div className="mt-1.5 flex flex-wrap gap-1">
              {WSZL_OPTIONS.map((w) => (
                <button
                  key={w}
                  type="button"
                  onClick={() => toggleWszl(w)}
                  className={cn(
                    "rounded-full border px-2 py-0.5 text-[11px]",
                    wszl.includes(w)
                      ? "border-primary bg-primary/15 text-primary"
                      : "border-border bg-background text-muted-foreground hover:border-input"
                  )}
                >
                  {w}
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label className="text-[11px]">裁判日期</Label>
            <div className="mt-1 flex items-center gap-1.5">
              <Input
                type="date"
                value={jaStart}
                onChange={(e) => setJaStart(e.target.value)}
                className="h-9 text-[12px]"
              />
              <span className="text-muted-foreground">~</span>
              <Input
                type="date"
                value={jaEnd}
                onChange={(e) => setJaEnd(e.target.value)}
                className="h-9 text-[12px]"
              />
            </div>
          </div>
          <div>
            <Label className="text-[11px]">返回条数（1-50）</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={topK}
              onChange={(e) => setTopK(Math.min(50, Math.max(1, Number(e.target.value) || 10)))}
              className="mt-1"
            />
          </div>
        </div>

        <div className="flex items-center justify-end pt-1">
          <Button onClick={handleSearch} disabled={pending} className="gap-1.5">
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Search className="h-3.5 w-3.5" />}
            检索类案
          </Button>
        </div>
      </div>

      {/* 结果区 */}
      {error && (
        <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/10 p-3 text-[12px] text-destructive">
          <CircleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {result && (
        <div className="space-y-2">
          <p className="text-[11px] text-muted-foreground">
            命中 <span className="font-mono text-foreground">{result.total}</span> 条，
            已返回 <span className="font-mono text-foreground">{result.items.length}</span> 条，
            本次扣 <span className="font-mono text-foreground">{result.pointsCharged}</span> POINT
          </p>
          <ul className="space-y-2">
            {result.items.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border border-border bg-card p-3"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 overflow-hidden">
                    <div className="text-sm font-medium leading-snug">{c.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="font-mono">{c.ah}</span>
                      <span>·</span>
                      <span>{c.jbdw}</span>
                      <span>·</span>
                      <span>{c.cprq}</span>
                      <span className="rounded border border-border bg-muted/30 px-1 py-0.5 text-[10px]">
                        {c.wszl}
                      </span>
                      {c.ay.map((y) => (
                        <span
                          key={y}
                          className="rounded border border-primary/30 bg-primary/5 px-1 py-0.5 text-[10px] text-primary"
                        >
                          {y}
                        </span>
                      ))}
                    </div>
                  </div>
                  <a
                    href={c.detailUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2 py-1 text-[11px] text-primary hover:bg-popover"
                  >
                    全文
                    <ExternalLink className="h-3 w-3" />
                  </a>
                </div>
                {c.content && (
                  <p className="mt-2 line-clamp-4 whitespace-pre-line text-[12px] leading-relaxed text-foreground/75">
                    {c.content}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
