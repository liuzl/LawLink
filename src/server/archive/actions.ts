"use server";

import { revalidatePath } from "next/cache";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { checklistForCategory, evaluateChecklist } from "@/lib/archive/checklists";
import { nextArchiveNo } from "@/lib/archive/archive-no";
import { renderArchiveCover, renderArchiveCatalog } from "./render";
import { archiveSubmitSchema, type ArchiveSubmitInput, CLOSED_REASON_CN } from "./schemas";

/**
 * v0.9.4 归档：完整流程
 *   1. 权限 (ADMIN / PRINCIPAL_LAWYER)
 *   2. 校验 checklist 缺必填项 → 若有且未 forceWithMissing 则拒绝
 *   3. 生成 archiveNo
 *   4. 渲染卷宗封皮 → 入 ARCHIVE 卷宗
 *   5. 渲染卷宗目录（含已生成的封皮自身可选不入目录）
 *   6. 创建 ArchiveRecord
 *   7. Matter status=ARCHIVED + archivedAt + closedAt
 *   8. TimelineEvent + audit
 */
export async function archiveMatter(input: ArchiveSubmitInput) {
  const session = await requireSession();
  const data = archiveSubmitSchema.parse(input);

  if (session.user.role !== "ADMIN" && session.user.role !== "PRINCIPAL_LAWYER") {
    throw new Error("只有管理员或主办律师可以归档");
  }

  const matter = await prisma.matter.findUnique({
    where: { id: data.matterId },
    select: { id: true, status: true, category: true, internalCode: true, title: true }
  });
  if (!matter) throw new Error("案件不存在");
  if (matter.status === "ARCHIVED") throw new Error("案件已归档");

  // checklist 缺项校验
  const checklist = checklistForCategory(matter.category);
  const { missingRequired } = evaluateChecklist(checklist, data.checklist);
  if (missingRequired.length > 0 && !data.forceWithMissing) {
    throw new Error(
      `归档清单缺必填项 ${missingRequired.length} 项：${missingRequired.map((x) => x.label).join("、")}。如确认强制归档，请勾选"强制归档"。`
    );
  }
  const missingItems = missingRequired.map((x) => x.id);

  // 渲染必须在事务外（涉及文件系统 + 加密）。先渲染再事务里建记录。
  const now = new Date();
  const archiveNo = await nextArchiveNo(prisma, matter.category, now);

  const extras = {
    archiveNo,
    closedReason: data.closedReason,
    completedAt: data.completedAt,
    archivedAt: now,
    judgmentSummary: data.judgmentSummary || undefined
  };

  let coverDocId: string;
  try {
    coverDocId = await renderArchiveCover(prisma, {
      matterId: matter.id,
      userId: session.user.id,
      extras
    });
  } catch (err) {
    throw new Error(`渲染卷宗封皮失败：${err instanceof Error ? err.message : String(err)}`);
  }

  let catalogDocId: string;
  try {
    catalogDocId = await renderArchiveCatalog(prisma, {
      matterId: matter.id,
      userId: session.user.id,
      extras,
      excludeDocIds: [coverDocId]
    });
  } catch (err) {
    // 封皮已落库；目录失败时回滚封皮文档（标记软删）。律师重试可重新生成。
    await prisma.document.update({
      where: { id: coverDocId },
      data: { deletedAt: new Date() }
    }).catch(() => null);
    throw new Error(`渲染卷宗目录失败：${err instanceof Error ? err.message : String(err)}`);
  }

  // 事务：建 ArchiveRecord + 改 Matter + TimelineEvent
  await prisma.$transaction(async (tx) => {
    await tx.archiveRecord.create({
      data: {
        matterId: matter.id,
        archiveNo,
        summary: data.summary,
        judgmentSummary: data.judgmentSummary || null,
        closedReason: data.closedReason,
        completedAt: data.completedAt,
        checklistJson: data.checklist as Prisma.InputJsonValue,
        missingItems,
        coverDocId,
        catalogDocId,
        archivedBy: session.user.name ?? session.user.id
      }
    });

    await tx.matter.update({
      where: { id: matter.id },
      data: {
        status: "ARCHIVED",
        archivedAt: now,
        closedAt: data.completedAt
      }
    });

    await tx.timelineEvent.create({
      data: {
        matterId: matter.id,
        eventType: "MATTER_ARCHIVED",
        title: `案件已归档（${archiveNo}）`,
        content: `结案方式：${CLOSED_REASON_CN[data.closedReason]}。${data.summary}`,
        occurredAt: now
      }
    });
  });

  await audit({
    userId: session.user.id,
    action: "MATTER_ARCHIVE",
    targetType: "Matter",
    targetId: matter.id,
    detail: {
      archiveNo,
      closedReason: data.closedReason,
      missingCount: missingItems.length,
      forced: data.forceWithMissing && missingItems.length > 0
    }
  });

  revalidatePath(`/matters/${matter.id}`);
  revalidatePath("/matters");
  revalidatePath("/archive");
  return { ok: true, archiveNo };
}

/**
 * 获取案件的归档准备数据：当前 checklist 模板 + 已有 ArchiveRecord（若有）
 */
export async function getArchivePrepData(matterId: string) {
  await requireSession();
  const matter = await prisma.matter.findUnique({
    where: { id: matterId },
    select: {
      id: true,
      title: true,
      internalCode: true,
      category: true,
      status: true,
      closedAt: true,
      archivedAt: true,
      archiveRecords: {
        orderBy: { archivedAt: "desc" },
        take: 1,
        select: {
          archiveNo: true,
          summary: true,
          judgmentSummary: true,
          closedReason: true,
          completedAt: true,
          checklistJson: true,
          missingItems: true,
          coverDocId: true,
          catalogDocId: true,
          archivedBy: true,
          archivedAt: true
        }
      }
    }
  });
  if (!matter) throw new Error("案件不存在");

  const checklist = checklistForCategory(matter.category);

  // v0.11: 取最近一次结案事件的 content 作为预填小结
  const lastCloseEvent = await prisma.timelineEvent.findFirst({
    where: { matterId, eventType: "MATTER_CLOSED" },
    orderBy: { occurredAt: "desc" },
    select: { content: true }
  });

  return {
    matter,
    checklist,
    existingSummary: lastCloseEvent?.content ?? null
  };
}

/**
 * 已归档案件列表（/archive 总览页）
 */
export async function listArchivedMatters() {
  await requireSession();
  return prisma.archiveRecord.findMany({
    orderBy: { archivedAt: "desc" },
    take: 200,
    select: {
      id: true,
      archiveNo: true,
      summary: true,
      closedReason: true,
      completedAt: true,
      archivedAt: true,
      archivedBy: true,
      missingItems: true,
      matter: {
        select: {
          id: true,
          title: true,
          internalCode: true,
          category: true,
          primaryClient: { select: { name: true } }
        }
      }
    }
  });
}
