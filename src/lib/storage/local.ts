import { promises as fs } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const STORAGE_ROOT = process.env.APP_STORAGE_DIR
  ? path.resolve(process.env.APP_STORAGE_DIR)
  : path.resolve(process.cwd(), "storage");

/**
 * 写入文件到 storage/<scope>/<yyyymm>/<uuid>.bin
 * 返回相对 STORAGE_ROOT 的 path（存到数据库）
 */
export async function writeFile(scope: string, data: Buffer): Promise<string> {
  const now = new Date();
  const yyyymm = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, "0")}`;
  const safeScope = scope.replace(/[^a-zA-Z0-9_-]/g, "_");
  const dir = path.join(STORAGE_ROOT, safeScope, yyyymm);
  await fs.mkdir(dir, { recursive: true });

  const filename = `${randomUUID()}.bin`;
  const relPath = path.posix.join(safeScope, yyyymm, filename);
  await fs.writeFile(path.join(STORAGE_ROOT, relPath), data);
  return relPath;
}

export async function readFile(relPath: string): Promise<Buffer> {
  const full = path.join(STORAGE_ROOT, relPath);
  // 防止路径穿越
  const resolved = path.resolve(full);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("非法路径");
  }
  return fs.readFile(resolved);
}

export async function deleteStoredFile(relPath: string): Promise<void> {
  const full = path.join(STORAGE_ROOT, relPath);
  const resolved = path.resolve(full);
  if (!resolved.startsWith(STORAGE_ROOT)) {
    throw new Error("非法路径");
  }
  try {
    await fs.unlink(resolved);
  } catch (err) {
    // 容忍文件已不存在
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") throw err;
  }
}

export function getStorageRoot() {
  return STORAGE_ROOT;
}
