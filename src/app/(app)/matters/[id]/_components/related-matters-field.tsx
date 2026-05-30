"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, X, Search, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  searchMattersForLink,
  addMatterLink,
  removeMatterLink
} from "@/server/matters/actions";

type MatterRef = { id: string; internalCode: string; title: string };

export function RelatedMattersField({
  matterId,
  related
}: {
  matterId: string;
  related: MatterRef[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<MatterRef[]>([]);
  const [searching, startSearch] = useTransition();
  const [pending, startMutate] = useTransition();

  function runSearch(q: string) {
    setQuery(q);
    startSearch(async () => {
      try {
        setResults(await searchMattersForLink(matterId, q));
      } catch {
        setResults([]);
      }
    });
  }

  function onOpenChange(o: boolean) {
    setOpen(o);
    if (o) runSearch("");
  }

  function add(id: string) {
    startMutate(async () => {
      try {
        await addMatterLink(matterId, id);
        toast.success("已关联");
        setOpen(false);
        setQuery("");
        router.refresh();
      } catch (err) {
        toast.error("关联失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  function remove(id: string) {
    startMutate(async () => {
      try {
        await removeMatterLink(matterId, id);
        router.refresh();
      } catch (err) {
        toast.error("解除失败", { description: err instanceof Error ? err.message : "" });
      }
    });
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {related.map((m) => (
        <span
          key={m.id}
          className="group inline-flex items-center gap-1 rounded-sm border border-border bg-muted/40 py-0.5 pl-2 pr-1 text-[12px]"
        >
          <Link
            href={`/matters/${m.id}`}
            className="inline-flex items-center gap-1 hover:text-primary"
            title={`${m.internalCode} ${m.title}`}
          >
            <span className="font-mono text-[10.5px] text-muted-foreground">{m.internalCode}</span>
            <span className="max-w-[180px] truncate">{m.title}</span>
            <ExternalLink className="h-3 w-3 shrink-0 opacity-50" />
          </Link>
          <button
            type="button"
            onClick={() => remove(m.id)}
            disabled={pending}
            className="rounded-sm p-0.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
            title="解除关联"
          >
            <X className="h-3 w-3" />
          </button>
        </span>
      ))}

      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger asChild>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="h-6 gap-1 rounded-sm px-2 text-[11px] text-muted-foreground"
          >
            <Plus className="h-3 w-3" />
            关联案件
          </Button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-80 p-2">
          <div className="relative mb-1.5">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              autoFocus
              value={query}
              onChange={(e) => runSearch(e.target.value)}
              placeholder="搜索案件名称 / 系统编号"
              className="h-8 pl-7 text-xs"
            />
          </div>
          <div className="max-h-64 space-y-1 overflow-y-auto">
            {searching ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              </div>
            ) : results.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground">无可关联的案件</p>
            ) : (
              results.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => add(m.id)}
                  disabled={pending}
                  className="flex w-full flex-col rounded-sm border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary disabled:opacity-50"
                >
                  <span className="font-mono text-[10.5px] text-muted-foreground">
                    {m.internalCode}
                  </span>
                  <span className="truncate">{m.title}</span>
                </button>
              ))
            )}
          </div>
        </PopoverContent>
      </Popover>

      {related.length === 0 && (
        <span className="text-[11px] text-muted-foreground">暂无关联</span>
      )}
    </div>
  );
}
