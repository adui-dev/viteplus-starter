import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname, join } from "node:path";
import { inspectPath } from "./safe-paths.mjs";
export function denyCoreJsBuild(source) {
  const lines = source.split(/\r?\n/),
    headers = lines.flatMap((line, index) =>
      /^(?:allowBuilds|'allowBuilds'|"allowBuilds")\s*:/.test(line) ? [index] : [],
    );
  if (lines.some((line) => /^(?:<<\s*:|---\s*$|\.\.\.\s*$)/.test(line)))
    throw new Error("无法安全合并构建策略：不支持 YAML 合并键或多文档");
  if (!headers.length) return source.trimEnd() + "\n\nallowBuilds:\n  core-js: false\n";
  if (headers.length !== 1 || !/^allowBuilds:\s*$/.test(lines[headers[0]]))
    throw new Error("仅支持 allowBuilds 块映射，不覆盖自定义构建策略");
  const start = headers[0];
  let end = start + 1;
  const names = new Set();
  for (; end < lines.length; end++) {
    const line = lines[end];
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) break;
    const match = /^  (?:(?:'([^']+)')|(?:"([^"]+)")|([^\s:]+)):\s*(true|false)\s*(?:#.*)?$/.exec(
      line,
    );
    if (!match) throw new Error("allowBuilds 含未识别规则，拒绝自动修改");
    const name = match[1] ?? match[2] ?? match[3];
    if (names.has(name)) throw new Error("allowBuilds 含重复规则，拒绝自动修改");
    names.add(name);
    if (name.startsWith("core-js@")) throw new Error("已有 core-js 版本规则，拒绝覆盖");
  }
  if (names.has("core-js")) return source;
  lines.splice(end, 0, "  core-js: false");
  return lines.join("\n");
}
export async function prepareUiBuildPolicy(directory, options) {
  if (options.framework !== "vue" || options.ui !== "antd") return null;
  for (let current = resolve(directory); ; current = dirname(current)) {
    const file = join(current, "pnpm-workspace.yaml");
    if (await inspectPath(file)) {
      const source = await readFile(file, "utf8"),
        next = denyCoreJsBuild(source);
      if (next === source) return null;
      await inspectPath(file);
      if ((await readFile(file, "utf8")) !== source)
        throw new Error("构建策略在预检后变化，拒绝覆盖");
      await writeFile(file, next);
      return file;
    }
    if (dirname(current) === current) break;
  }
  throw new Error("Ant Design Vue 需要可确认的 pnpm-workspace.yaml 构建策略");
}
