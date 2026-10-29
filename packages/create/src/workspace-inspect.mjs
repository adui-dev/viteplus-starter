import { readFile, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { inspectPath } from "./safe-paths.mjs";
import { validateWorkspacePackages } from "./workspace.mjs";
import { validateBatchConfig } from "./batch.mjs";
import { planIntegrations } from "./integrations.mjs";
import { planUiSmoke } from "./ui-smoke.mjs";
import { planScreenPreset } from "./screen.mjs";
import { planEngine } from "./engine.mjs";
import { planModelProtection } from "./model-protection.mjs";

async function json(path) {
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

async function configs(directory) {
  const found = [];
  for (const ext of ["ts", "mts", "js", "mjs"])
    if ((await inspectPath(join(directory, "vite.config." + ext), "工作区检查"))?.isFile())
      found.push(ext);
  return found;
}

export async function inspectWorkspace(directory, configFile) {
  const root = resolve(directory);
  if (!(await inspectPath(root, "工作区检查"))?.isDirectory())
    throw new Error("工作区根目录不存在");
  const manifest = await json(join(root, "package.json"));
  if (
    manifest.private !== true ||
    !(manifest.devDependencies?.["vite-plus"] ?? manifest.dependencies?.["vite-plus"])
  )
    throw new Error("目标必须是 private 的 Vite+ pnpm 工作区");
  const yaml = join(root, "pnpm-workspace.yaml");
  const metadata = await inspectPath(yaml, "工作区检查");
  if (!metadata?.isFile() || metadata.size > 1024 * 1024)
    throw new Error("缺少或过大的工作区 YAML");
  validateWorkspacePackages(await readFile(yaml, "utf8"));
  if (!(await inspectPath(join(root, "apps"), "工作区检查"))?.isDirectory())
    throw new Error("缺少官方 apps 目录");
  const expected = configFile ? validateBatchConfig(await json(resolve(configFile))).apps : [];
  const issues = [],
    members = [],
    names = new Set(typeof manifest.name === "string" ? [manifest.name] : []);
  if (typeof manifest.name !== "string" || !manifest.name) issues.push("根清单缺少有效包名");
  if ((await configs(root)).length !== 1) issues.push("根 Vite 配置缺失或不唯一");
  for (const parent of ["apps", "packages", "tools"]) {
    const path = join(root, parent);
    const info = await inspectPath(path, "工作区检查");
    if (!info) continue;
    if (!info.isDirectory()) {
      issues.push(parent + " 不是目录");
      continue;
    }
    for (const entry of (await readdir(path)).sort()) {
      if (entry === "node_modules" || entry.startsWith(".")) continue;
      const target = join(path, entry);
      if (!(await inspectPath(target, "工作区检查"))?.isDirectory()) continue;
      const problems = [];
      let pkg;
      try {
        pkg = await json(join(target, "package.json"));
      } catch {
        problems.push("清单缺失或无效");
      }
      if (typeof pkg?.name !== "string" || !pkg.name) problems.push("缺少有效包名");
      else if (names.has(pkg.name)) issues.push("工作区存在重复包名：" + pkg.name);
      else names.add(pkg.name);
      // Never return manifest scripts, environment files, or arbitrary config contents.
      members.push({
        path: parent + "/" + entry,
        packageName: typeof pkg?.name === "string" ? pkg.name : null,
        problems,
      });
    }
  }
  const apps = [];
  for (const app of expected) {
    const target = join(root, "apps", app.name),
      info = await inspectPath(target, "工作区检查");
    if (!info) {
      apps.push({ name: app.name, status: "not-created", issues: ["应用目录不存在"] });
      continue;
    }
    const problems = [];
    if (!info.isDirectory()) {
      apps.push({ name: app.name, status: "blocked", issues: ["目标不是目录"] });
      continue;
    }
    let pkg;
    try {
      pkg = await json(join(target, "package.json"));
    } catch {
      problems.push("清单缺失或无效");
    }
    const options = { ...app, type: "application" },
      integration = planIntegrations(options);
    const dependencies = { ...pkg?.dependencies, ...pkg?.devDependencies };
    const engine = await planEngine(options),
      protection = planModelProtection(options);
    const deps = [
      app.framework,
      "vite-plus",
      ...integration.dependencies,
      ...integration.devDependencies,
      ...(engine?.dependencies ?? []).map((spec) => spec.slice(0, spec.lastIndexOf("@"))),
      ...(engine?.devDependencies ?? []).map((spec) => spec.slice(0, spec.lastIndexOf("@"))),
    ];
    for (const name of deps) if (!dependencies[name]) problems.push("缺少依赖声明：" + name);
    if (dependencies[app.framework === "vue" ? "react" : "vue"])
      problems.push("同时声明另一框架，需人工确认");
    if ((await configs(target)).length !== 1) problems.push("应用 Vite 配置缺失或不唯一");
    const ext =
      app.framework === "vue"
        ? app.language === "ts"
          ? "ts"
          : "js"
        : app.language === "ts"
          ? "tsx"
          : "jsx";
    const files = new Set([
      "src/main." + ext,
      "index.html",
      ...(app.uiSmoke ? Object.keys(planUiSmoke(options).files) : []),
      ...(app.screen ? Object.keys((await planScreenPreset(options)).files) : []),
      ...(engine?.files ?? []),
      ...(protection?.files ?? []),
    ]);
    for (const file of files)
      if (!(await inspectPath(join(target, file), "工作区检查"))?.isFile())
        problems.push("缺少文件：" + file);
    apps.push({
      name: app.name,
      status: problems.length ? "blocked" : "present",
      issues: problems,
    });
  }
  return {
    root,
    readOnly: true,
    ok:
      !issues.length &&
      members.every((member) => !member.problems.length) &&
      apps.every((app) => app.status === "present"),
    issues,
    members,
    apps,
    limitations:
      "仅检查声明和文件结构；不执行配置、安装、构建或恢复，不证明预设配置有效或版本兼容。旧源码快照与当前计划可能有差异，缺失项须人工核对。",
  };
}
