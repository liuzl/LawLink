"use client";

/**
 * v0.28: 引导式 AI 文书起草对话框（对照"案件云"填空式起草）
 * 用填空式自然语言表单代替空白输入框，降低律师的提示成本。
 */
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { Loader2, Sparkles, Copy, Download } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { draftDocument } from "@/server/ai/draft-document";

const DOC_TYPES = [
  "民事起诉状",
  "民事答辩状",
  "代理词",
  "律师函",
  "法律意见书",
  "民事上诉状",
  "仲裁申请书",
  "管辖权异议申请书"
];

export function DocumentDraftDialog({
  open,
  onOpenChange,
  defaultSelf,
  defaultOpposing
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSelf?: string | null;
  defaultOpposing?: string | null;
}) {
  const [docType, setDocType] = useState(DOC_TYPES[0]);
  const [selfParty, setSelfParty] = useState(defaultSelf ?? "");
  const [opposingParty, setOpposingParty] = useState(defaultOpposing ?? "");
  const [background, setBackground] = useState("");
  const [claims, setClaims] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleDraft() {
    if (!background.trim() && !claims.trim()) {
      toast.warning("请至少填写案件背景或诉讼请求", {
        description: "信息越具体，生成的草稿越可用"
      });
      return;
    }
    startTransition(async () => {
      const res = await draftDocument({
        docType,
        selfParty,
        opposingParty,
        background,
        claims
      });
      if (res.ok) {
        setResult(res.content);
        toast.success("草稿已生成，请核校");
      } else if (res.reason === "not_configured") {
        toast.error("AI 未配置", { description: "请到 设置 → AI 接入 填写 API key" });
      } else {
        toast.error("生成失败", { description: res.message });
      }
    });
  }

  function handleCopy() {
    if (!result) return;
    navigator.clipboard.writeText(result).then(
      () => toast.success("已复制到剪贴板"),
      () => toast.error("复制失败")
    );
  }

  function handleDownload() {
    if (!result) return;
    const blob = new Blob([result], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${docType}-草稿.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-1.5">
            <Sparkles className="h-4 w-4 text-primary" />
            AI 引导式起草
          </DialogTitle>
          <DialogDescription>
            按提示填空，AI 生成 Markdown 文书草稿；草稿仅供参考，需律师核校。
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          {/* 填空式自然语言表单 */}
          <div className="space-y-3 rounded-lg border border-border bg-muted/20 p-3 text-[13px] leading-7">
            <div className="flex flex-wrap items-center gap-x-1 gap-y-2">
              <span>我方</span>
              <Input
                value={selfParty}
                onChange={(e) => setSelfParty(e.target.value)}
                placeholder="我方当事人"
                className="h-8 w-48"
              />
              <span>，对方</span>
              <Input
                value={opposingParty}
                onChange={(e) => setOpposingParty(e.target.value)}
                placeholder="对方当事人（可选）"
                className="h-8 w-48"
              />
              <span>，需要起草一份</span>
              <Select value={docType} onValueChange={setDocType}>
                <SelectTrigger className="h-8 w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DOC_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>
                      {t}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span>。</span>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">案件背景</label>
            <Textarea
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              placeholder="简述事实经过、时间、关键节点…"
              rows={4}
            />
          </div>

          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">
              诉讼请求 / 核心主张
            </label>
            <Textarea
              value={claims}
              onChange={(e) => setClaims(e.target.value)}
              placeholder="列举诉讼请求或本文书的核心主张…"
              rows={3}
            />
          </div>

          <Button onClick={handleDraft} disabled={pending} className="w-full gap-1.5">
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            {pending ? "生成中…" : "立即起草"}
          </Button>

          {result && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">生成结果</span>
                <div className="flex gap-1">
                  <Button variant="outline" size="sm" onClick={handleCopy} className="h-7 gap-1">
                    <Copy className="h-3 w-3" />
                    复制
                  </Button>
                  <Button variant="outline" size="sm" onClick={handleDownload} className="h-7 gap-1">
                    <Download className="h-3 w-3" />
                    下载 .md
                  </Button>
                </div>
              </div>
              <pre className="max-h-72 overflow-y-auto whitespace-pre-wrap rounded-lg border border-border bg-card p-3 text-[12.5px] leading-6">
                {result}
              </pre>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
