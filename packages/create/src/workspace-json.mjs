import { readFile } from "node:fs/promises";
import { inspectPath } from "./safe-paths.mjs";

export async function readJsonObject(path, label, maxBytes = Infinity) {
  const metadata = await inspectPath(path, label);
  if (!metadata?.isFile() || metadata.size > maxBytes)
    throw new Error("缺少或过大的 JSON 文件：" + path);
  try {
    const value = JSON.parse((await readFile(path, "utf8")).replace(/^\uFEFF/, ""));
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error();
    return value;
  } catch {
    throw new Error("无效 JSON 对象：" + path);
  }
}

export function readWorkspaceJson(path) {
  return readJsonObject(path, "工作区检查", 1024 * 1024);
}
