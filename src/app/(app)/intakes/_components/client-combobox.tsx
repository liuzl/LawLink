"use client";

import { useState, useEffect, useRef } from "react";
import { Check, ChevronsUpDown, Plus, Users } from "lucide-react";
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
import { cn } from "@/lib/utils";
import type { ClientOption } from "@/app/(app)/matters/_components/matters-view";

/**
 * 委托方 Combobox：
 * - 选已有客户 → onPickExisting(id, name)，clientName/clientId 二选一
 * - 自由输入名字（不在选项里）→ onTypeNew(name)，由提交时自动建档
 */
export function ClientCombobox({
  clientId,
  clientName,
  options,
  onPickExisting,
  onTypeNew,
  onClear
}: {
  clientId: string;
  clientName: string;
  options: ClientOption[];
  onPickExisting: (id: string, name: string) => void;
  onTypeNew: (name: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const triggerRef = useRef<HTMLButtonElement>(null);

  const display = clientId
    ? options.find((o) => o.id === clientId)?.name ?? clientName ?? ""
    : clientName;

  const filtered = options
    .filter((o) => !query || o.name.toLowerCase().includes(query.toLowerCase()))
    .slice(0, 20);

  const hasExactMatch = filtered.some(
    (o) => o.name.toLowerCase() === query.trim().toLowerCase()
  );

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          ref={triggerRef}
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className={cn(
            "h-10 w-full justify-between font-normal",
            !display && "text-muted-foreground"
          )}
        >
          <span className="flex items-center gap-1.5 truncate">
            <Users className="h-3.5 w-3.5 shrink-0 opacity-60" />
            {display || "搜索或直接输入委托方名字"}
            {clientId && (
              <span className="ml-1 rounded-sm bg-primary/15 px-1 text-[10px] text-primary">
                已建档
              </span>
            )}
            {!clientId && clientName && (
              <span className="ml-1 rounded-sm bg-primary/10 px-1 text-[10px] text-primary/80">
                新客户
              </span>
            )}
          </span>
          <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[--radix-popover-trigger-width] p-0"
        align="start"
      >
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="输入姓名 / 公司名"
            value={query}
            onValueChange={setQuery}
          />
          <CommandList>
            {query.trim() && !hasExactMatch && (
              <CommandGroup heading="作为新客户使用">
                <CommandItem
                  value={`__new__${query}`}
                  onSelect={() => {
                    onTypeNew(query.trim());
                    setOpen(false);
                  }}
                  className="gap-2"
                >
                  <Plus className="h-3.5 w-3.5 text-primary" />
                  <span>
                    新建 <span className="text-primary">{query.trim()}</span> 为委托方
                  </span>
                </CommandItem>
              </CommandGroup>
            )}

            {filtered.length > 0 ? (
              <CommandGroup heading="已有客户">
                {filtered.map((o) => (
                  <CommandItem
                    key={o.id}
                    value={o.name}
                    onSelect={() => {
                      onPickExisting(o.id, o.name);
                      setOpen(false);
                    }}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-3.5 w-3.5",
                        clientId === o.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    {o.name}
                  </CommandItem>
                ))}
              </CommandGroup>
            ) : !query ? (
              <CommandEmpty className="py-4 text-xs text-muted-foreground">
                开始输入以搜索 / 新建
              </CommandEmpty>
            ) : null}

            {display && (
              <CommandGroup>
                <CommandItem
                  value="__clear__"
                  onSelect={() => {
                    onClear();
                    setOpen(false);
                  }}
                  className="text-xs text-muted-foreground"
                >
                  清除选择
                </CommandItem>
              </CommandGroup>
            )}
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
