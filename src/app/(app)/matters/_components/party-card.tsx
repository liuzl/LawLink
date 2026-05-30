"use client";

/**
 * 案件当事人表格行（intake-sheet 专用）
 *
 * 参考"案件云"建案表单的当事人表格：一行一当事人，列对齐，次要字段折叠。
 * 列：角色 | 类型 | 姓名/名称 | 诉讼地位 | 证件号/信用代码 | 操作
 * - 角色 / 诉讼地位两列由调用方注入（roleSlot / standingSlot），本组件不关心其取值逻辑
 * - 类型（自然人 / 单位）、证件（身份证号 / 统一社会信用代码 + AI 查找）、展开次要字段、删除由本组件负责
 * - 次要字段（法代 / 电话 / 联系人 / 地址 / 备注）默认折叠，点"更多"在行下方展开
 *
 * PARTY_GRID 同时给表头与每一行使用，保证列对齐。
 *
 * 校验落在 zod superRefine（partyInputSchema）；本组件只负责 UI + 字段联动。
 */
import { useState, useTransition, type ReactNode } from "react";
import { useFormContext, type FieldErrors } from "react-hook-form";
import { ChevronDown, Loader2, Search, Sparkles, Trash2 } from "lucide-react";
import type { PartyType } from "@prisma/client";
import { toast } from "sonner";
import { partyTypeLabel, PARTY_TYPE_OPTIONS } from "@/lib/enums";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  searchEnterpriseCandidates,
  getEnterpriseDetail,
  type EnterpriseSearchItem
} from "@/server/yuandian/enterprise";

/** 表头与每一行共用，保证列对齐。诉讼/仲裁类含「诉讼地位」列 */
export const PARTY_GRID =
  "grid grid-cols-[68px_92px_minmax(0,1.3fr)_minmax(0,1.35fr)_84px_112px_104px_44px] items-center gap-1.5";
/** 非诉/顾问/专项：无「诉讼地位」列 */
export const PARTY_GRID_NO_STANDING =
  "grid grid-cols-[68px_92px_minmax(0,1.3fr)_minmax(0,1.35fr)_84px_112px_44px] items-center gap-1.5";

type Props = {
  index: number;
  fieldPrefix: string; // e.g. "parties"
  onRemove: () => void;
  errors?: FieldErrors<Record<string, unknown>>;
  /** 角色单元格内容（委托方徽标 / 对方·第三人下拉） */
  roleSlot: ReactNode;
  /** 诉讼地位单元格内容（showStanding 为 false 时忽略） */
  standingSlot?: ReactNode;
  /** 是否显示「诉讼地位」列。诉讼/仲裁类 true，非诉/顾问/专项 false。默认 true */
  showStanding?: boolean;
  /** false 时隐藏删除按钮（如委托方行恒存在）。默认 true */
  removable?: boolean;
  /** 提供时替换内置"姓名/名称"输入框（如委托方行注入客户选择器）。 */
  nameSlot?: ReactNode;
};

export function PartyCard({
  index,
  fieldPrefix,
  onRemove,
  errors,
  roleSlot,
  standingSlot,
  showStanding = true,
  removable = true,
  nameSlot
}: Props) {
  const { register, watch, setValue } = useFormContext();
  const p = `${fieldPrefix}.${index}`;
  const partyType = (watch(`${p}.partyType`) as PartyType) ?? "NATURAL_PERSON";
  const isOrg = partyType !== "NATURAL_PERSON";

  const [candidates, setCandidates] = useState<EnterpriseSearchItem[] | null>(null);
  const [searching, startSearch] = useTransition();
  const [filling, startFill] = useTransition();
  const [expanded, setExpanded] = useState(false);

  // 次要字段是否已有内容（折叠态给个小提示）
  const secondaryFilled = [
    watch(`${p}.address`),
    watch(`${p}.notes`),
    isOrg ? watch(`${p}.legalRep`) : undefined
  ].filter((v) => typeof v === "string" && v.trim() !== "").length;

  function changeType(next: PartyType) {
    setValue(`${p}.partyType`, next, { shouldDirty: true, shouldValidate: true });
    // 切换类型时清空对侧的必填字段，避免提示串台
    if (next === "NATURAL_PERSON") {
      setValue(`${p}.enterpriseSocialCode`, "");
      setValue(`${p}.enterpriseName`, "");
    } else {
      setValue(`${p}.idNumber`, "");
    }
  }

  function handleAILookup() {
    const name = (watch(`${p}.name`) as string | undefined)?.trim();
    if (!name) {
      toast.warning("请先填写公司名称再点击 AI 查找");
      return;
    }
    startSearch(async () => {
      try {
        const r = await searchEnterpriseCandidates(name);
        if (!r.configured) {
          toast.error("元典 API 未配置，无法 AI 查找", {
            description: "请在 设置 → AI 与元典 中配置 API Key"
          });
          return;
        }
        if (r.items.length === 0) {
          toast.info("未找到候选企业", { description: "试试更完整的名称或简称" });
          return;
        }
        setCandidates(r.items);
      } catch (err) {
        toast.error("查找失败", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  function handlePickCandidate(item: EnterpriseSearchItem) {
    startFill(async () => {
      // 先回填 social code + 企业名称（搜索结果已有）
      setValue(`${p}.enterpriseSocialCode`, item.creditCode, { shouldDirty: true, shouldValidate: true });
      setValue(`${p}.enterpriseName`, item.name, { shouldDirty: true });
      setValue(`${p}.name`, item.name, { shouldDirty: true });
      setCandidates(null);

      // 再调详情接口拿法代 + 地址（10 POINT/次）
      try {
        const r = await getEnterpriseDetail(item.id);
        if (r.configured && r.info) {
          if (r.info.legalRep) setValue(`${p}.legalRep`, r.info.legalRep, { shouldDirty: true });
          if (r.info.address) setValue(`${p}.address`, r.info.address, { shouldDirty: true });
          setExpanded(true); // 展开让用户核对回填的法代 / 地址
          toast.success(`已回填：${item.name}`);
        }
      } catch (err) {
        // 详情失败不阻塞，已填的 social code 仍有效
        toast.warning("法代 / 地址自动填充失败，可手动补充", {
          description: err instanceof Error ? err.message : ""
        });
      }
    });
  }

  const fieldErr = (errors as any)?.[fieldPrefix]?.[index] ?? {};
  const idErr = partyType === "NATURAL_PERSON" ? fieldErr.idNumber : fieldErr.enterpriseSocialCode;

  const grid = showStanding ? PARTY_GRID : PARTY_GRID_NO_STANDING;

  return (
    <div className="rounded-md border border-border bg-background">
      <div className={cn(grid, "px-2 py-1.5")}>
        {/* 角色 */}
        <div className="min-w-0">{roleSlot}</div>

        {/* 主体类型 */}
        <Select value={partyType} onValueChange={(v) => changeType(v as PartyType)}>
          <SelectTrigger className="h-8 bg-background px-2 text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {PARTY_TYPE_OPTIONS.map((t) => (
              <SelectItem key={t} value={t} className="text-xs">
                {partyTypeLabel[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* 姓名 / 名称 */}
        <div className="min-w-0">
          {nameSlot ?? (
            <Input
              className="h-8 text-sm"
              placeholder={isOrg ? "单位 / 组织名称" : "姓名"}
              {...register(`${p}.name`)}
            />
          )}
        </div>

        {/* 证件号 / 信用代码 */}
        <div className="flex min-w-0 items-center gap-1">
          {!isOrg ? (
            <Input
              placeholder="身份证号（必填）"
              className={cn("h-8 font-mono text-xs", idErr && "border-destructive")}
              {...register(`${p}.idNumber`)}
            />
          ) : (
            <>
              <Input
                placeholder="统一社会信用代码（必填）"
                className={cn("h-8 flex-1 font-mono text-xs", idErr && "border-destructive")}
                {...register(`${p}.enterpriseSocialCode`)}
              />
              <Popover
                open={!!candidates && candidates.length > 0}
                onOpenChange={(o) => {
                  if (!o) setCandidates(null);
                }}
              >
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAILookup}
                    disabled={searching || filling}
                    className="h-8 w-8 shrink-0 p-0 text-primary"
                    title="按公司名称在元典搜索 → 自动回填信用代码 + 法代 + 地址"
                  >
                    {searching ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Sparkles className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent align="end" className="w-72 p-1.5">
                  <div className="mb-1 flex items-center gap-1 px-1 text-[10px] text-muted-foreground">
                    <Search className="h-3 w-3" />共 {candidates?.length ?? 0} 条候选，点击回填
                  </div>
                  <ul className="max-h-64 space-y-1 overflow-y-auto">
                    {candidates?.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => handlePickCandidate(c)}
                          disabled={filling}
                          className="w-full rounded border border-border bg-background px-2 py-1.5 text-left text-xs hover:border-primary disabled:opacity-50"
                        >
                          <div className="font-medium">{c.name}</div>
                          <div className="font-mono text-[10px] text-muted-foreground">{c.creditCode}</div>
                        </button>
                      </li>
                    ))}
                  </ul>
                </PopoverContent>
              </Popover>
            </>
          )}
        </div>

        {/* 联系人 */}
        <Input
          className="h-8 text-sm"
          placeholder="联系人"
          {...register(`${p}.contactName`)}
        />

        {/* 联系电话 */}
        <Input
          className="h-8 font-mono text-xs"
          placeholder="联系电话"
          {...register(`${p}.phone`)}
        />

        {/* 诉讼地位（仅诉讼/仲裁类）*/}
        {showStanding && <div className="min-w-0">{standingSlot}</div>}

        {/* 操作：更多 + 删除 */}
        <div className="flex items-center justify-end gap-0.5">
          <button
            type="button"
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? "收起" : "更多（法定代表人 / 地址 / 备注）"}
            className={cn(
              "flex h-6 w-6 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground",
              !expanded && secondaryFilled > 0 && "text-primary"
            )}
          >
            <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", expanded && "rotate-180")} />
          </button>
          {removable && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onRemove}
              className="h-6 w-6 shrink-0 p-0 text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* 必填项错误（折叠态也要可见） */}
      {idErr && (
        <p className="px-2 pb-1.5 text-[10px] text-destructive">{idErr.message as string}</p>
      )}

      {/* 次要字段（展开） */}
      {expanded && (
        <div className="grid grid-cols-1 gap-2 border-t border-border px-2 py-2 sm:grid-cols-2">
          {isOrg && (
            <Input
              className="h-8 text-sm"
              placeholder="法定代表人 / 负责人（可选）"
              {...register(`${p}.legalRep`)}
            />
          )}
          <div className="sm:col-span-2">
            <Input
              className="h-8 text-sm"
              placeholder={isOrg ? "注册地址（可选）" : "住址（可选）"}
              {...register(`${p}.address`)}
            />
          </div>
          <div className="sm:col-span-2">
            <Input className="h-8 text-sm" placeholder="备注（可选）" {...register(`${p}.notes`)} />
          </div>
        </div>
      )}
    </div>
  );
}
