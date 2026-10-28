import { open, lstat, readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { randomBytes, randomUUID } from "node:crypto";
import { parseEnv } from "node:util";
export async function generateProjectKey(project, { rotate = false, keyId } = {}) {
  const root = resolve(project),
    target = join(root, ".env.local");
  for (let path = target; ; path = dirname(path)) {
    try {
      if ((await lstat(path)).isSymbolicLink()) throw new Error("密钥文件拒绝链接路径");
    } catch (error) {
      if (error.code !== "ENOENT") throw error;
    }
    if (dirname(path) === path) break;
  }
  let original = null;
  try {
    const file = await open(target, "r");
    try {
      const stat = await file.stat();
      if (!stat.isFile() || stat.size > 64 * 1024) throw new Error("env 文件类型或大小无效");
      const bytes = Buffer.alloc(stat.size + 1);
      let offset = 0;
      while (offset < bytes.length) {
        const { bytesRead } = await file.read(bytes, offset, bytes.length - offset, null);
        if (!bytesRead) break;
        offset += bytesRead;
      }
      if (offset !== stat.size) throw new Error("读取期间 env 文件发生变化");
      original = bytes.subarray(0, offset).toString("utf8");
    } finally {
      await file.close();
    }
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  const vars = original === null ? {} : parseEnv(original);
  if ((vars.ADUI_MODEL_KEY || vars.VITE_ADUI_AES_KEY) && !rotate)
    throw new Error("模型 KEY 已存在；需要轮换时运行 models:keyrotate");
  const id = keyId ?? "adui-" + randomUUID().replaceAll("-", "").slice(0, 16);
  if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/.test(id)) throw new Error("密钥标识无效");
  const raw = randomBytes(32);
  let content;
  try {
    content =
      (original ?? "")
        .replace(
          /^[ \t]*(?:export[ \t]+)?([A-Za-z_][A-Za-z0-9_]*)[ \t]*=[ \t]*(?:"(?:\\[\s\S]|[^"\\])*"|'[^']*'|[^\r\n]*)(?:[ \t]*(?:#[^\r\n]*)?)?/gm,
          (entry, name) =>
            [
              "ADUI_MODEL_KEY",
              "ADUI_MODEL_KEY_ID",
              "VITE_ADUI_AES_KEY",
              "VITE_ADUI_AES_IV",
            ].includes(name)
              ? ""
              : entry,
        )
        .replace(/\n*$/, "") +
      "\nADUI_MODEL_KEY_ID=" +
      id +
      "\nADUI_MODEL_KEY=" +
      raw.toString("base64") +
      "\n";
  } finally {
    raw.fill(0);
  }
  let backup;
  if (original !== null) {
    backup = target + ".before-" + Date.now() + "-" + randomUUID().slice(0, 8);
    await writeFile(backup, original, { flag: "wx", mode: 0o600 });
    if ((await lstat(target)).isSymbolicLink()) throw new Error("密钥文件拒绝链接路径");
    if ((await readFile(target, "utf8")) !== original)
      throw new Error("env 在预检后变化，已保留备份");
    await writeFile(target, content, { mode: 0o600 });
  } else await writeFile(target, content, { flag: "wx", mode: 0o600 });
  return { file: target, backup };
}
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const args = process.argv.slice(2);
    if (args.some((value) => value !== "--rotate") || args.length > 1)
      throw new Error("只支持 --rotate");
    await generateProjectKey(process.cwd(), { rotate: args.includes("--rotate") });
    console.log(
      "模型 KEY 已生成；IV 在每个模型加密时随机生成并写入 .adui。轮换后请重新构建全部模型。",
    );
  } catch (error) {
    console.error(error.code ? "生成密钥失败：" + error.code : error.message);
    process.exitCode = 1;
  }
}
