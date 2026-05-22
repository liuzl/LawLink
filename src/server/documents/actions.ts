"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";
import { writeFile, deleteStoredFile } from "@/lib/storage/local";
import { encryptBuffer, sha256 } from "@/lib/storage/crypto";

const documentCategorySchema = z.enum([
  "EVIDENCE",
  "PLEADING",
  "PROCEDURE",
  "JUDGMENT",
  "CONTRACT",
  "OTHER"
]);

const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

/**
 * 上传材料。前端通过 Server Action 传 FormData，含 file（File）、metadata。
 * 加密分支：encrypted=true 时把文件用 AES-256-GCM 加密后写盘。
 */
export async function uploadDocument(formData: FormData) {
  const session = await requireSession();

  const matterId = formData.get("matterId");
  const procedureId = formData.get("procedureId");
  const name = formData.get("name");
  const category = formData.get("category");
  const encrypted = formData.get("encrypted") === "true";
  const tagsRaw = formData.get("tags");
  const file = formData.get("file");

  if (!(file instanceof File)) throw new Error("缺少文件");
  if (typeof matterId !== "string") throw new Error("matterId 缺失");
  if (typeof name !== "string" || !name.trim()) throw new Error("材料名称必填");
  const parsedCategory = documentCategorySchema.parse(category || "OTHER");
  const tags =
    typeof tagsRaw === "string" && tagsRaw
      ? tagsRaw.split(",").map((t) => t.trim()).filter(Boolean)
      : [];

  if (file.size === 0) throw new Error("文件为空");
  if (file.size > MAX_FILE_SIZE) {
    throw new Error(`文件超过 ${MAX_FILE_SIZE / 1024 / 1024}MB 限制`);
  }

  // 校验案件存在
  const matter = await prisma.matter.findUnique({
    where: { id: matterId, deletedAt: null },
    select: { id: true, status: true }
  });
  if (!matter) throw new Error("案件不存在");
  if (matter.status === "ARCHIVED") throw new Error("已归档案件不可上传材料");

  const raw = Buffer.from(await file.arrayBuffer());
  const hash = sha256(raw);

  let path: string;
  let iv: string | null = null;
  let authTag: string | null = null;
  let algorithm: string | null = null;

  if (encrypted) {
    const enc = encryptBuffer(raw);
    path = await writeFile(`m_${matterId}`, enc.ciphertext);
    iv = enc.iv.toString("base64");
    authTag = enc.authTag.toString("base64");
    algorithm = enc.algorithm;
  } else {
    path = await writeFile(`m_${matterId}`, raw);
  }

  const created = await prisma.document.create({
    data: {
      matterId,
      procedureId: typeof procedureId === "string" && procedureId ? procedureId : null,
      name,
      category: parsedCategory,
      path,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      sha256: hash,
      encrypted,
      algorithm,
      iv,
      authTag,
      tags,
      uploadedById: session.user.id
    }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_UPLOAD",
    targetType: "Document",
    targetId: created.id,
    detail: { matterId, name, encrypted, size: file.size }
  });

  revalidatePath(`/matters/${matterId}`);
  revalidatePath("/documents");
  return { ok: true, id: created.id };
}

export async function deleteDocument(id: string) {
  const session = await requireSession();
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };

  if (
    doc.uploadedById !== session.user.id &&
    session.user.role !== "ADMIN" &&
    session.user.role !== "PRINCIPAL_LAWYER"
  ) {
    throw new Error("只能删除自己上传的材料（或由 ADMIN/主办删除）");
  }

  // 软删除（保留文件以备审计），如需物理删除走单独脚本
  await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() }
  });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name }
  });

  revalidatePath(`/matters/${doc.matterId}`);
  revalidatePath("/documents");
  return { ok: true };
}

export async function hardDeleteDocument(id: string) {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅 ADMIN 可彻底删除材料");
  }
  const doc = await prisma.document.findUnique({ where: { id } });
  if (!doc) return { ok: false };

  await deleteStoredFile(doc.path);
  await prisma.document.delete({ where: { id } });

  await audit({
    userId: session.user.id,
    action: "DOCUMENT_HARD_DELETE",
    targetType: "Document",
    targetId: id,
    detail: { matterId: doc.matterId, name: doc.name }
  });

  revalidatePath(`/matters/${doc.matterId}`);
  return { ok: true };
}

const docListQuerySchema = z.object({
  search: z.string().optional(),
  category: documentCategorySchema.optional(),
  matterId: z.string().cuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(200)
});

export async function listAllDocuments(input: Partial<z.infer<typeof docListQuerySchema>> = {}) {
  await requireSession();
  const query = docListQuerySchema.parse(input);

  const where: Prisma.DocumentWhereInput = {
    deletedAt: null,
    matter: { deletedAt: null },
    ...(query.category ? { category: query.category } : {}),
    ...(query.matterId ? { matterId: query.matterId } : {}),
    ...(query.search
      ? {
          OR: [
            { name: { contains: query.search, mode: "insensitive" } },
            { tags: { has: query.search } }
          ]
        }
      : {})
  };

  return prisma.document.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: query.limit,
    include: {
      matter: { select: { id: true, internalCode: true, title: true } },
      uploadedBy: { select: { id: true, name: true } }
    }
  });
}
