import { z } from "zod";

export const archiveClosedReasonSchema = z.enum([
  "JUDGMENT",
  "MEDIATION",
  "WITHDRAWAL",
  "SETTLEMENT",
  "RULING",
  "OTHER"
]);

export const archiveSubmitSchema = z.object({
  matterId: z.string().cuid(),
  summary: z.string().min(1, "结案小结必填").max(4000),
  closedReason: archiveClosedReasonSchema,
  completedAt: z.coerce.date(),
  judgmentSummary: z.string().max(2000).optional().or(z.literal("")),
  // checklist 勾选状态：{ itemId: true/false }
  checklist: z.record(z.boolean()).default({}),
  // 律师确认强制归档（缺必填项时需 true 才能提交）
  forceWithMissing: z.boolean().default(false)
});

export type ArchiveSubmitInput = z.infer<typeof archiveSubmitSchema>;

export const CLOSED_REASON_CN: Record<z.infer<typeof archiveClosedReasonSchema>, string> = {
  JUDGMENT: "判决",
  MEDIATION: "调解",
  WITHDRAWAL: "撤诉",
  SETTLEMENT: "和解",
  RULING: "裁定",
  OTHER: "其他"
};
