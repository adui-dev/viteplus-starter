import { readFile } from "node:fs/promises";
import { inspectPath } from "./safe-paths.mjs";

export async function readWorkspaceJson(path) {
  const metadata = await inspectPath(path, "工作区检查");
  if (!metadata?.isFile() || metadata.size > 1024 * 1024)
    throw new Error("缺少或过大的 JSON 文件：" + path);
  try {
    const value = JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error("无效 JSON 对象：" + path);
  }
}
