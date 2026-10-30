import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { inspectPath } from "./safe-paths.mjs";

const stylesheet = "src/styles/normalize.css";
const license = "src/styles/normalize.LICENSE.txt";
const reference = "./styles/normalize.css";
const importLine = 'import "./styles/normalize.css";\n';
const lf = (value) => value.replaceAll("\r\n", "\n");

export function planBaseStyles(options) {
  if (options.type === "monorepo") return null;
  const language = options.language ?? "ts";
  if (!["vue", "react"].includes(options.framework) || !["ts", "js"].includes(language))
    throw new Error("基础样式仅支持 Vue/React 的 TS/JS Application");
  return {
    entry: `src/main.${language}${options.framework === "react" ? "x" : ""}`,
    files: [stylesheet, license],
    import: reference,
    version: "8.0.1",
    source: "https://necolas.github.io/normalize.css/latest/normalize.css",
    dependencies: [],
  };
}

// Keep the BOM, hashbang and leading comments before the first import.
function prefixLength(source) {
  let index = source.startsWith("\uFEFF") ? 1 : 0;
  if (source.startsWith("#!", index)) {
    const end = source.indexOf("\n", index);
    if (end < 0) throw new Error("入口 hashbang 后缺少换行，拒绝修改");
    index = end + 1;
  }
  while (index < source.length) {
    const whitespace = /^\s*/.exec(source.slice(index))[0];
    index += whitespace.length;
    if (source.startsWith("//", index)) {
      const end = source.indexOf("\n", index);
      if (end < 0) return source.length;
      index = end + 1;
    } else if (source.startsWith("/*", index)) {
      const end = source.indexOf("*/", index + 2);
      if (end < 0) throw new Error("入口注释未闭合，拒绝修改");
      index = end + 2;
    } else break;
  }
  return index;
}

function entryWithNormalize(source) {
  const prefix = prefixLength(source);
  const matches = [
    ...source.matchAll(
      /^[\t ]*import\s*(['"])\.\/styles\/normalize\.css\1[\t ]*;?[\t ]*(?:\r?\n|$)/gm,
    ),
  ].filter((match) => match.index >= prefix);
  if (matches.length > 1) throw new Error("normalize.css 重复导入，拒绝自动修改");
  if (!matches.length) {
    if (source.slice(prefix).includes(reference))
      throw new Error("无法安全识别已有 normalize.css 引用，拒绝修改");
    const separator = prefix && !source.slice(0, prefix).endsWith("\n") ? "\n" : "";
    return {
      imported: false,
      next: source.slice(0, prefix) + separator + importLine + source.slice(prefix),
    };
  }
  const match = matches[0];
  if (match.index === prefix) return { imported: true, next: source };
  const without = source.slice(0, match.index) + source.slice(match.index + match[0].length);
  const insertion = prefixLength(without);
  return {
    imported: true,
    next: without.slice(0, insertion) + importLine + without.slice(insertion),
  };
}

export async function preflightBaseStyles(directory, options) {
  const plan = planBaseStyles(options);
  if (!plan) return null;
  const mainPath = join(directory, plan.entry);
  const packagePath = join(directory, "package.json");
  for (const path of [mainPath, packagePath])
    if (!(await inspectPath(path, "基础样式"))?.isFile())
      throw new Error("基础样式缺少应用文件：" + path);
  let manifest;
  try {
    manifest = JSON.parse((await readFile(packagePath, "utf8")).replace(/^\uFEFF/, ""));
    if (!manifest || typeof manifest !== "object" || Array.isArray(manifest)) throw new Error();
  } catch {
    throw new Error("基础样式应用 package.json 无效");
  }
  const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
  if (!dependencies["vite-plus"] || !dependencies[options.framework])
    throw new Error("基础样式目标不是所选 Vite+ Vue/React 应用");
  const source = await readFile(mainPath, "utf8");
  const entry = entryWithNormalize(source);
  const originals = await Promise.all([
    readFile(new URL("../assets/normalize.css", import.meta.url), "utf8"),
    readFile(new URL("../assets/normalize.LICENSE.txt", import.meta.url), "utf8"),
  ]);
  const assets = Object.fromEntries(plan.files.map((file, index) => [file, lf(originals[index])]));
  const states = await Promise.all(
    plan.files.map((file) => inspectPath(join(directory, file), "基础样式")),
  );
  const existing = states.some(Boolean);
  if (existing || entry.imported) {
    if (!entry.imported || !states.every((state) => state?.isFile()))
      throw new Error("基础样式文件或导入已被占用/部分完成，拒绝覆盖");
    for (const file of plan.files)
      if (lf(await readFile(join(directory, file), "utf8")) !== assets[file])
        throw new Error("基础样式文件已存在且内容不同，拒绝覆盖：" + file);
  }
  return {
    plan,
    mainPath,
    source,
    next: entry.next,
    assets,
    newFiles: !existing,
    changed: !existing || source !== entry.next,
  };
}

function format(directory, files) {
  const args = ["fmt", ...files, "--write"];
  const result =
    process.platform === "win32"
      ? spawnSync(["vp", ...args].join(" "), { cwd: directory, stdio: "inherit", shell: true })
      : spawnSync("vp", args, { cwd: directory, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("基础样式格式化失败");
}

export async function addBaseStyles(directory, options, formatter = format) {
  const state = await preflightBaseStyles(directory, options);
  if (!state?.changed) return false;
  async function checkEntry() {
    await inspectPath(state.mainPath, "基础样式");
    if ((await readFile(state.mainPath, "utf8")) !== state.source)
      throw new Error("基础样式写入期间入口已变化，拒绝覆盖");
  }
  await checkEntry();
  if (state.newFiles) {
    const folder = join(directory, "src/styles");
    await inspectPath(folder, "基础样式");
    await mkdir(folder, { recursive: true });
    for (const [file, content] of Object.entries(state.assets)) {
      await inspectPath(join(directory, file), "基础样式");
      await writeFile(join(directory, file), content, { flag: "wx" });
    }
  }
  await checkEntry();
  if (state.next !== state.source) await writeFile(state.mainPath, state.next);
  await formatter(directory, [state.plan.entry, ...(state.newFiles ? [stylesheet] : [])]);
  return true;
}
