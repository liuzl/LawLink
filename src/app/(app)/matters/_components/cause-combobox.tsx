"use client";

import { useState, useEffect, useMemo, useTransition } from "react";
import { Check, ChevronsUpDown, Loader2, FolderTree } from "lucide-react";
import type { MatterCategory } from "@prisma/client";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import { searchCauses, type CauseSearchResult } from "@/server/causes/actions";
import { cn } from "@/lib/utils";

type Props = {
  value: string;
  onChange: (id: string, name: string) => void;
  category: MatterCategory;
  disabled?: boolean;
};

export function CauseCombobox({ value, onChange, category, disabled }: Props) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<CauseSearchResult[]>([]);
  const [isPending, startTransition] = useTransition();
  const [selectedName, setSelectedName] = useState<string>("");
  const [selectedL2, setSelectedL2] = useState<string | null>(null);
  // 当前在"浏览二级"模式下选定的二级 id（null = 全部）
  const [browseL2Id, setBrowseL2Id] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState<string>("");

  // 选中项时同步 displayName + l2
  useEffect(() => {
    if (value && options.length > 0) {
      const found = options.find((o) => o.id === value);
      if (found) {
        setSelectedName(found.name);
        setSelectedL2(found.l2Name);
      }
    }
  }, [value, options]);

  // 打开时加载（空 query 拉二级 + 三级）
  function handleOpen(o: boolean) {
    setOpen(o);
    if (o && options.length === 0) {
      startTransition(async () => {
        const data = await searchCauses({ category, limit: 200 });
        setOptions(data);
      });
    }
  }

  // category 变化时重置
  useEffect(() => {
    setOptions([]);
    setBrowseL2Id(null);
    setSearchInput("");
    if (value) {
      onChange("", "");
      setSelectedName("");
      setSelectedL2(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  // 当用户输入搜索词时，重新拉取
  useEffect(() => {
    if (!open) return;
    const q = searchInput.trim();
    const handle = setTimeout(() => {
      startTransition(async () => {
        const data = await searchCauses({
          category,
          query: q || undefined,
          limit: 200
        });
        setOptions(data);
      });
    }, 200);
    return () => clearTimeout(handle);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchInput, open, category]);

  // 把 options 分组：二级在 group 头 + 它下面的三级
  // 浏览模式 (无搜索词) 时显示分组结构；搜索时显示扁平结果但每条带路径
  const isSearching = searchInput.trim().length > 0;

  const l2Options = useMemo(
    () => options.filter((o) => o.level === 2),
    [options]
  );

  const filteredL3 = useMemo(() => {
    const l3 = options.filter((o) => o.level >= 3);
    if (!browseL2Id) return l3;
    // 通过 l2Name 匹配（因为 parent.id 可能不是直接父，但 l2Name 是链上找的）
    const l2 = options.find((o) => o.id === browseL2Id);
    if (!l2) return l3;
    return l3.filter((o) => o.l2Name === l2.name);
  }, [options, browseL2Id]);

  return (
    <Popover open={open} onOpenChange={handleOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="h-10 w-full justify-between font-normal"
        >
          {value && selectedName ? (
            <span className="flex min-w-0 items-baseline gap-1.5">
              {selectedL2 && (
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {selectedL2} /
                </span>
              )}
              <span className="truncate">{selectedName}</span>
            </span>
          ) : (
            <span className="text-muted-foreground">搜索或选择案由</span>
          )}
          <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[--radix-popover-trigger-width] min-w-[420px] p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入关键词搜索；或在下方按二级分类浏览"
            value={searchInput}
            onValueChange={setSearchInput}
          />

          {/* 浏览模式下显示二级分类筛选条 */}
          {!isSearching && l2Options.length > 0 && (
            <div className="flex flex-wrap gap-1 border-b border-border bg-muted/20 px-2 py-1.5">
              <button
                type="button"
                onClick={() => setBrowseL2Id(null)}
                className={cn(
                  "rounded px-2 py-0.5 text-[11px] transition-colors",
                  browseL2Id === null
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                全部二级
              </button>
              {l2Options.map((l2) => (
                <button
                  key={l2.id}
                  type="button"
                  onClick={() => setBrowseL2Id(l2.id)}
                  className={cn(
                    "rounded px-2 py-0.5 text-[11px] transition-colors",
                    browseL2Id === l2.id
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                  title={l2.l1Name ? `${l2.l1Name} / ${l2.name}` : l2.name}
                >
                  <FolderTree className="mr-1 inline h-3 w-3" />
                  {l2.name}
                </button>
              ))}
            </div>
          )}

          <CommandList className="max-h-[300px]">
            {isPending ? (
              <div className="flex items-center justify-center py-6 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span className="ml-2">加载案由库...</span>
              </div>
            ) : (
              <>
                <CommandEmpty>未找到匹配案由</CommandEmpty>
                <CommandGroup>
                  {(isSearching ? options : filteredL3).map((opt) => (
                    <CommandItem
                      key={opt.id}
                      value={`${opt.code} ${opt.name} ${opt.shortName ?? ""}`}
                      onSelect={() => {
                        onChange(opt.id, opt.name);
                        setSelectedName(opt.name);
                        setSelectedL2(opt.l2Name);
                        setOpen(false);
                      }}
                    >
                      <Check
                        className={cn(
                          "mr-2 h-4 w-4 shrink-0",
                          value === opt.id ? "opacity-100" : "opacity-0"
                        )}
                      />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-baseline gap-1.5">
                          {opt.level <= 2 && (
                            <span className="rounded-sm bg-primary/10 px-1 text-[9px] text-primary">
                              二级
                            </span>
                          )}
                          <span className="truncate text-[13px]">{opt.name}</span>
                        </div>
                        {/* 路径：一级 / 二级（三级才显示） */}
                        {opt.level >= 3 && (opt.l2Name || opt.l1Name) && (
                          <div className="text-[10.5px] text-muted-foreground">
                            {[opt.l1Name, opt.l2Name].filter(Boolean).join(" / ")}
                          </div>
                        )}
                      </div>
                      {opt.shortName && (
                        <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">
                          {opt.shortName}
                        </span>
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
