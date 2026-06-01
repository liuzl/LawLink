"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth/session";
import { audit } from "@/server/audit";

const userRoleSchema = z.enum([
  "ADMIN",
  "PRINCIPAL_LAWYER",
  "LAWYER",
  "ASSISTANT",
  "FINANCE"
]);

const userCreateSchema = z.object({
  name: z.string().min(1, "姓名必填").max(40),
  email: z.string().email("邮箱格式不正确"),
  password: z.string().min(8, "密码至少 8 位").max(128),
  role: userRoleSchema,
  phone: z.string().max(30).optional().or(z.literal(""))
});

const userUpdateRoleSchema = z.object({
  id: z.string().cuid(),
  role: userRoleSchema
});

const resetPasswordSchema = z.object({
  id: z.string().cuid(),
  newPassword: z.string().min(8).max(128)
});

const changeMyPasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(128)
});

export type UserCreateInput = z.infer<typeof userCreateSchema>;
export type UserUpdateRoleInput = z.infer<typeof userUpdateRoleSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type ChangeMyPasswordInput = z.infer<typeof changeMyPasswordSchema>;

async function requireAdmin() {
  const session = await requireSession();
  if (session.user.role !== "ADMIN") {
    throw new Error("仅管理员可执行");
  }
  return session;
}

export async function listUsers() {
  await requireAdmin();
  return prisma.user.findMany({
    orderBy: [{ active: "desc" }, { role: "asc" }, { createdAt: "asc" }],
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      active: true,
      lastLoginAt: true,
      createdAt: true,
      _count: { select: { ownedMatters: true, memberships: true } }
    }
  });
}

/**
 * 任意登录用户都可调：拿活跃同事列表，用于收案/案件团队选择。
 * 默认排除 FINANCE/ADMIN 系统角色（仍可选，做"全部"切换时再开放）。
 */
export async function listActiveColleagues() {
  await requireSession();
  return prisma.user.findMany({
    where: { active: true },
    orderBy: [{ role: "asc" }, { name: "asc" }],
    select: { id: true, name: true, role: true }
  });
}

export async function createUser(input: UserCreateInput) {
  const session = await requireAdmin();
  const data = userCreateSchema.parse(input);

  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new Error("邮箱已被使用");

  const passwordHash = await bcrypt.hash(data.password, 12);
  const created = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      role: data.role,
      phone: data.phone || null,
      active: true
    }
  });

  await audit({
    userId: session.user.id,
    action: "USER_CREATE",
    targetType: "User",
    targetId: created.id,
    detail: { email: created.email, role: created.role }
  });

  revalidatePath("/settings/users");
  return { ok: true, id: created.id };
}

export async function updateUserRole(input: UserUpdateRoleInput) {
  const session = await requireAdmin();
  const data = userUpdateRoleSchema.parse(input);
  if (data.id === session.user.id) {
    throw new Error("不能修改自己的角色");
  }

  await prisma.user.update({
    where: { id: data.id },
    data: { role: data.role }
  });

  await audit({
    userId: session.user.id,
    action: "USER_ROLE_UPDATE",
    targetType: "User",
    targetId: data.id,
    detail: { role: data.role }
  });

  revalidatePath("/settings/users");
  return { ok: true };
}

export async function toggleUserActive(id: string) {
  const session = await requireAdmin();
  if (id === session.user.id) {
    throw new Error("不能禁用自己");
  }
  const current = await prisma.user.findUnique({ where: { id }, select: { active: true } });
  if (!current) throw new Error("用户不存在");

  await prisma.user.update({
    where: { id },
    data: { active: !current.active }
  });

  await audit({
    userId: session.user.id,
    action: current.active ? "USER_DEACTIVATE" : "USER_ACTIVATE",
    targetType: "User",
    targetId: id
  });

  revalidatePath("/settings/users");
  return { ok: true, active: !current.active };
}

export async function resetUserPassword(input: ResetPasswordInput) {
  const session = await requireAdmin();
  const data = resetPasswordSchema.parse(input);

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: data.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_RESET",
    targetType: "User",
    targetId: data.id
  });

  return { ok: true };
}

/**
 * 当前用户改自己的密码（任何角色可用）。
 */
export async function changeMyPassword(input: ChangeMyPasswordInput) {
  const session = await requireSession();
  const data = changeMyPasswordSchema.parse(input);

  const me = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { passwordHash: true }
  });
  if (!me) throw new Error("用户不存在");

  const matches = await bcrypt.compare(data.currentPassword, me.passwordHash);
  if (!matches) throw new Error("当前密码不正确");

  const passwordHash = await bcrypt.hash(data.newPassword, 12);
  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash }
  });

  await audit({
    userId: session.user.id,
    action: "USER_PASSWORD_CHANGE_SELF",
    targetType: "User",
    targetId: session.user.id
  });

  return { ok: true };
}

/** v0.43：保存 / 清除个人头像（base64 data URL 内联存 User.avatar，约 256KB 上限） */
const AVATAR_MAX_CHARS = 256 * 1024;
export async function saveMyAvatar(input: { avatar: string | null }) {
  const session = await requireSession();
  let avatar = input.avatar;
  if (typeof avatar === "string" && avatar.length > 0) {
    if (!/^data:image\/(png|jpeg|jpg|webp|svg\+xml);base64,/.test(avatar)) {
      throw new Error("头像必须是 PNG / JPG / WebP / SVG 图片");
    }
    if (avatar.length > AVATAR_MAX_CHARS) {
      throw new Error("头像体积过大，请控制在约 180KB 以内");
    }
  } else {
    avatar = null;
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { avatar }
  });

  await audit({
    userId: session.user.id,
    action: "USER_AVATAR_UPDATE",
    targetType: "User",
    targetId: session.user.id
  });

  revalidatePath("/", "layout");
  return { ok: true };
}
