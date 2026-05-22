"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  FileBox,
  Search,
  Download,
  Lock,
  X,
  File as FileIcon,
  FileText,
  FileSpreadsheet,
  FileImage,
  FileArchive
} from "lucide-react";
import type { Document, DocumentCategory } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type DocRow = Document & {
  matter: { id: string; internalCode: string; title: string };
  uploadedBy: { id: string; name: string };
};

const categoryLabel: Record<DocumentCategory, string> = {
  EVIDENCE: "证据材料",
  PLEADING: "诉讼文书",
  PROCEDURE: "程序性材料",
  JUDGMENT: "裁判文书",
  CONTRACT: "合同",
  OTHER: "其他"
};

const categoryColor: Record<DocumentCategory, string> = {
  EVIDENCE: "#5B8DEF",
  PLEADING: "#4FD1C5",
  PROCEDURE: "#9B7BF7",
  JUDGMENT: "#FBBF24",
  CONTRACT: "#4ADE80",
  OTHER: "#9BA8C7"
};

function iconFor(mimeType: string | null) {
  if (!mimeType) return FileIcon;
  if (mimeType.startsWith("image/")) return FileImage;
  if (mimeType.includes("spreadsheet") || mimeType.includes("excel")) return FileSpreadsheet;
  if (mimeType.includes("pdf") || mimeType.includes("word") || mimeType.startsWith("text/")) return FileText;
  if (mimeType.includes("zip") || mimeType.includes("rar")) return FileArchive;
  return FileIcon;
}

function formatBytes(b: number) {
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
  return `${(b / 1024 / 1024).toFixed(2)} MB`;
}

export function DocumentsView({
  items,
  initialFilters
}: {
  items: DocRow[];
  initialFilters: { search: string; category: DocumentCategory | "ALL" };
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [search, setSearch] = useState(initialFilters.search);
  const [category, setCategory] = useState<DocumentCategory | "ALL">(initialFilters.category);

  const updateUrl = useCallback(
    (next: { search?: string; category?: string }) => {
      const params = new URLSearchParams();
      const s = next.search ?? search;
      const c = next.category ?? category;
      if (s) params.set("search", s);
      if (c && c !== "ALL") params.set("category", c);
      startTransition(() => {
        router.replace(`/documents${params.toString() ? `?${params.toString()}` : ""}`);
      });
    },
    [router, search, category]
  );

  function clearFilters() {
    setSearch("");
    setCategory("ALL");
    startTransition(() => router.replace("/documents"));
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="space-y-5"
    >
      <header>
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <FileBox className="h-5 w-5 text-primary" />
          材料库
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          跨案件检索全部材料 · 共 {items.length} 份
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card/40 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateUrl({ search });
          }}
          className="relative flex-1 min-w-64"
        >
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onBlur={() => updateUrl({ search })}
            placeholder="搜索材料名称 / 标签"
            className="h-9 pl-9 bg-background/60"
          />
        </form>

        <Select
          value={category}
          onValueChange={(v) => {
            const next = v as DocumentCategory | "ALL";
            setCategory(next);
            updateUrl({ category: next });
          }}
        >
          <SelectTrigger className="h-9 w-36 bg-background/60">
            <SelectValue placeholder="分类" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">全部分类</SelectItem>
            {Object.entries(categoryLabel).map(([k, v]) => (
              <SelectItem key={k} value={k}>
                {v}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {(search || category !== "ALL") && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1">
            <X className="h-3.5 w-3.5" />
            清除
          </Button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/20 py-16 text-center">
          <FileBox className="mx-auto mb-2 h-8 w-8 text-muted-foreground/40" />
          <p className="text-sm text-muted-foreground">
            没有匹配的材料。材料需在案件详情上传。
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card/40">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-popover/30">
              <tr className="text-left text-xs uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-3 font-medium">材料</th>
                <th className="px-5 py-3 font-medium">案件</th>
                <th className="px-5 py-3 font-medium">分类</th>
                <th className="px-5 py-3 font-medium">大小</th>
                <th className="px-5 py-3 font-medium">上传</th>
                <th className="w-20 px-5 py-3 font-medium">下载</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {items.map((d) => {
                const Icon = iconFor(d.mimeType);
                const color = categoryColor[d.category];
                return (
                  <tr key={d.id} className="transition-colors hover:bg-popover/40">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border"
                          style={{ borderColor: `${color}40`, color }}
                        >
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 overflow-hidden">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-medium">{d.name}</span>
                            {d.encrypted && (
                              <Lock className="h-3 w-3 text-[#9B7BF7]" />
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        href={`/matters/${d.matter.id}`}
                        className="block hover:text-primary"
                      >
                        <div className="font-mono text-[11px] text-muted-foreground tabular">
                          {d.matter.internalCode}
                        </div>
                        <div className="line-clamp-1 text-xs">{d.matter.title}</div>
                      </Link>
                    </td>
                    <td className="px-5 py-3">
                      <Badge
                        variant="outline"
                        className="text-[10px]"
                        style={{ borderColor: `${color}40`, color }}
                      >
                        {categoryLabel[d.category]}
                      </Badge>
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground tabular">
                      {d.size ? formatBytes(d.size) : "—"}
                    </td>
                    <td className="px-5 py-3 text-xs">
                      <div>{d.uploadedBy.name}</div>
                      <div className="font-mono text-[10px] text-muted-foreground tabular">
                        {new Date(d.createdAt).toLocaleDateString("zh-CN")}
                      </div>
                    </td>
                    <td className="px-5 py-3">
                      <a
                        href={`/api/documents/${d.id}/download`}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground hover:bg-popover hover:text-primary"
                      >
                        <Download className="h-4 w-4" />
                      </a>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </motion.div>
  );
}
