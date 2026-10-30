import { lstat, readFile, realpath, readdir, writeFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { validateProjectOptions } from "./options.mjs";
import { ignoreGeneratedVueComponentDeclarations } from "./format-config.mjs";

async function inspect(path) {
  try {
    const stat = await lstat(path);
    if (stat.isSymbolicLink()) throw new Error("工作区路径不允许符号链接或 junction：" + path);
    return stat;
  } catch (error) {
    if (error.code === "ENOENT") return null;
    throw error;
  }
}

// Only the official block-list layout is supported; do not guess at custom YAML/globs.
export function validateWorkspacePackages(source) {
  const lines = source.split(/\r?\n/);
  if (lines.some((line) => /^(?:<<\s*:|---\s*$|\.\.\.\s*$)/.test(line))) {
    throw new Error("不支持 YAML 合并键或多个文档");
  }
  const headers = lines.flatMap((line, index) =>
    /^(?:packages|"packages"|'packages')\s*:/.test(line) ? [index] : [],
  );
  if (headers.length !== 1 || !/^packages:\s*$/.test(lines[headers[0]])) {
    throw new Error("仅支持官方 pnpm packages 列表，须包含 apps/*");
  }
  const entries = [];
  for (const line of lines.slice(headers[0] + 1)) {
    if (!line.trim() || /^\s*#/.test(line)) continue;
    if (/^\S/.test(line)) break;
    const match = /^  - (?:'([^']+)'|"([^"]+)"|([^\s#]+))\s*(?:#.*)?$/.exec(line);
    const value = match && (match[1] ?? match[2] ?? match[3]);
    if (!["apps/*", "packages/*", "tools/*"].includes(value)) {
      throw new Error("不支持自定义 workspace glob，请保留官方 apps/*、packages/*、tools/* 列表");
    }
    entries.push(value);
  }
  if (!entries.includes("apps/*")) throw new Error("工作区 packages 必须包含 apps/*");
}

export function planWorkspacePeerExtensions(source, options) {
  const packages = [
    ...(options.framework === "vue" && (options.ui ?? "none") !== "none"
      ? ["unplugin-vue-components"]
      : []),
    ...(options.css === "unocss" ? ["unocss"] : []),
  ];
  if (!packages.length) return source;
  const lines = source.split(/\r?\n/);
  const headers = lines.flatMap((line, index) =>
    /^(?:packageExtensions|"packageExtensions"|'packageExtensions')\s*:/.test(line) ? [index] : [],
  );
  if (!headers.length) {
    return (
      source.trimEnd() +
      "\n\npackageExtensions:\n" +
      packages.map((name) => `  '${name}@*':\n    peerDependencies:\n      vite: '*'\n`).join("")
    );
  }
  if (headers.length !== 1 || !/^packageExtensions:\s*$/.test(lines[headers[0]])) {
    throw new Error("无法安全合并现有 packageExtensions，请使用 YAML 块映射");
  }
  const start = headers[0] + 1;
  let end = start;
  while (
    end < lines.length &&
    (!lines[end].trim() || /^\s/.test(lines[end]) || lines[end].startsWith("#"))
  )
    end++;
  const body = lines.slice(start, end);
  if (body.some((line) => /^  <<\s*:/.test(line)))
    throw new Error("不支持 packageExtensions YAML 合并键");
  const additions = [];
  for (const name of packages) {
    const related = body.flatMap((line, index) => (line.includes(name + "@") ? [index] : []));
    if (related.length) {
      const at = related[0];
      const key = body[at].trim();
      if (
        related.length !== 1 ||
        !/^  \S/.test(body[at]) ||
        ![`${name}@*:`, `'${name}@*':`, `"${name}@*":`].includes(key)
      ) {
        throw new Error("现有 packageExtensions 可能与 Vite peer 修复冲突：" + name);
      }
      let next = at + 1;
      while (next < body.length && !/^  \S/.test(body[next])) next++;
      const entry = body.slice(at + 1, next).join("\n");
      if (!/^    peerDependencies:\s*\n(?: {6}[^\n]*\n)* {6}vite: ['"]\*['"]\s*$/m.test(entry)) {
        throw new Error("保留现有 packageExtensions，请先确认 vite peer：" + name);
      }
      continue;
    }
    additions.push(`  '${name}@*':`, "    peerDependencies:", "      vite: '*'");
  }
  if (!additions.length) return source;
  lines.splice(start, 0, ...additions);
  return lines.join("\n");
}

export async function prepareWorkspacePeerExtensions(context) {
  if (context.peerSource === context.peerUpdated) return false;
  await inspect(context.workspacePath);
  const source = await readFile(context.workspacePath, "utf8");
  if (source !== context.peerSource) throw new Error("工作区配置已改变，请重新执行预检");
  await writeFile(context.workspacePath, context.peerUpdated);
  return true;
}

export async function resolveWorkspaceApplication(input, cwd = process.cwd()) {
  const options = validateProjectOptions(input);
  if (options.workspace === undefined) throw new Error("缺少 --workspace");
  const root = await realpath(resolve(cwd, options.workspace));
  for (const filename of ["package.json", "pnpm-workspace.yaml"]) {
    if (!(await inspect(join(root, filename)))?.isFile())
      throw new Error("缺少工作区文件：" + filename);
  }
  const manifest = JSON.parse(await readFile(join(root, "package.json"), "utf8"));
  if (
    manifest.private !== true ||
    !(manifest.devDependencies?.["vite-plus"] ?? manifest.dependencies?.["vite-plus"])
  ) {
    throw new Error("目标必须是 private 的 Vite+ pnpm Monorepo 根目录");
  }
  const workspacePath = join(root, "pnpm-workspace.yaml");
  const peerSource = await readFile(workspacePath, "utf8");
  validateWorkspacePackages(peerSource);
  const peerUpdated = planWorkspacePeerExtensions(peerSource, options);
  const apps = await inspect(join(root, "apps"));
  if (!apps?.isDirectory()) throw new Error("缺少官方 apps 目录");
  const target = join(root, "apps", options.name);
  const existing = await inspect(target);
  if (existing && !existing.isDirectory()) throw new Error("应用目标不是目录");
  const scope = manifest.name?.startsWith("@") ? manifest.name.split("/")[0] : null;
  const packageName = scope ? scope + "/" + options.name : options.name;
  for (const parent of ["apps", "packages", "tools"]) {
    const parentPath = join(root, parent);
    if (!(await inspect(parentPath))?.isDirectory()) continue;
    for (const entry of await readdir(parentPath, { withFileTypes: true })) {
      const directory = join(parentPath, entry.name);
      if (directory === target || !entry.isDirectory() || entry.isSymbolicLink()) continue;
      const packagePath = join(directory, "package.json");
      if ((await inspect(packagePath))?.isFile()) {
        const pkg = JSON.parse(await readFile(packagePath, "utf8"));
        if (pkg.name === packageName) throw new Error("工作区已有同名包：" + packageName);
      }
    }
  }
  const configs = [];
  for (const filename of [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs",
  ]) {
    if ((await inspect(join(root, filename)))?.isFile()) configs.push(join(root, filename));
  }
  if (configs.length !== 1) throw new Error("无法唯一识别工作区根 Vite+ 配置");
  const generatedPath =
    options.framework === "vue" &&
    (options.language ?? "ts") === "ts" &&
    (options.ui ?? "none") !== "none"
      ? "apps/" + options.name + "/src/components.d.ts"
      : null;
  // Fail before invoking the official generator when the root config cannot be merged safely.
  if (generatedPath)
    ignoreGeneratedVueComponentDeclarations(await readFile(configs[0], "utf8"), generatedPath);
  return {
    root,
    target,
    configPath: configs[0],
    generatedPath,
    exists: Boolean(existing),
    workspacePath,
    peerSource,
    peerUpdated,
  };
}

export async function updateWorkspaceDeclarationIgnore(context) {
  if (!context.generatedPath) return false;
  await inspect(context.configPath);
  const source = await readFile(context.configPath, "utf8");
  const updated = ignoreGeneratedVueComponentDeclarations(source, context.generatedPath);
  if (source === updated) return false;
  await writeFile(context.configPath, updated);
  return true;
}

export function runWorkspaceVp(cwd, args) {
  const result =
    process.platform === "win32"
      ? spawnSync(["vp", ...args].join(" "), { cwd, stdio: "inherit", shell: true })
      : spawnSync("vp", args, { cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Object.assign(new Error("工作区本地命令失败：vp " + args.join(" ")), {
      exitCode: result.status ?? 1,
    });
}

// Official monorepo app templates may retain imports that the root lint rule rejects.
// Use Vite+'s own targeted fixer; never format or lint-fix existing sibling applications.
export async function normalizeNewWorkspaceApplication(context, runner = runWorkspaceVp, options) {
  const configs = [];
  for (const filename of [
    "vite.config.ts",
    "vite.config.mts",
    "vite.config.js",
    "vite.config.mjs",
  ]) {
    if ((await inspect(join(context.target, filename)))?.isFile()) configs.push(filename);
  }
  if (configs.length !== 1) throw new Error("无法唯一识别新应用 Vite 配置");
  runner(context.target, ["lint", configs[0], "--fix"]);
  runner(context.target, ["fmt", configs[0], "--write"]);
  // Give Vue JS its own project scope instead of merging wildcard declarations into the root.
  if (options?.framework === "vue" && options.language === "js") {
    const path = join(context.target, "tsconfig.json");
    if (!(await inspect(path)) && !(await inspect(join(context.target, "jsconfig.json")))) {
      await writeFile(
        path,
        JSON.stringify(
          {
            compilerOptions: {
              allowJs: true,
              noEmit: true,
              target: "ES2022",
              module: "ESNext",
              moduleResolution: "bundler",
              types: ["vite/client"],
            },
            include: ["src/**/*", configs[0]],
          },
          null,
          2,
        ) + "\n",
        { flag: "wx" },
      );
      runner(context.target, ["fmt", "tsconfig.json", "--write"]);
    }
  }
}
