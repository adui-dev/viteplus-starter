import { pendingRecovery, recoveryAdvice } from "./recovery.mjs";
import { lstat, readFile, realpath, stat } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { buildVpCommand, validateProjectName, validateProjectOptions } from "./options.mjs";
import { planIntegrations } from "./integrations.mjs";
import { planUiSmoke } from "./ui-smoke.mjs";
import { planScreenPreset } from "./screen.mjs";
import { planEngine } from "./engine.mjs";
import { planModelProtection } from "./model-protection.mjs";
import { resolveWorkspaceApplication, runWorkspaceVp } from "./workspace.mjs";

const cliPath = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const maxConfigBytes = 1024 * 1024;

function fields(value, allowed, label) {
  if (!value || typeof value !== "object" || Array.isArray(value))
    throw new Error(label + " 必须是对象");
  for (const key of Object.keys(value)) {
    if (!allowed.includes(key)) throw new Error(label + " 包含未知字段：" + key);
  }
}

function portableName(name) {
  validateProjectName(name);
  if (/^(?:con|prn|aux|nul|com[1-9]|lpt[1-9])$/.test(name))
    throw new Error("不能使用 Windows 保留名称：" + name);
}

export function validateBatchConfig(input) {
  fields(input, ["version", "name", "apps"], "批量配置");
  if (input.version !== 1) throw new Error("批量配置 version 必须为 1");
  portableName(input.name);
  if (["website", "utils"].includes(input.name))
    throw new Error("工作区名称与官方默认包冲突：" + input.name);
  if (!Array.isArray(input.apps) || input.apps.length < 1 || input.apps.length > 32) {
    throw new Error("apps 必须包含 1 至 32 个应用");
  }
  const names = new Set([input.name, "website", "utils"]);
  const apps = input.apps.map((app, index) => {
    const label = "apps[" + index + "]";
    fields(
      app,
      [
        "name",
        "framework",
        "language",
        "ui",
        "css",
        "uiSmoke",
        "screen",
        "engine",
        "engines",
        "modelProtection",
      ],
      label,
    );
    portableName(app.name);
    if (names.has(app.name)) throw new Error("应用重名或与工作区/官方默认包冲突：" + app.name);
    names.add(app.name);
    for (const key of ["framework", "language", "ui", "css", "engine", "modelProtection"]) {
      if (Object.hasOwn(app, key) && typeof app[key] !== "string")
        throw new Error(label + "." + key + " 必须是字符串");
    }
    if (Object.hasOwn(app, "uiSmoke") && typeof app.uiSmoke !== "boolean")
      throw new Error(label + ".uiSmoke 必须是布尔值");
    const options = validateProjectOptions({
      ...app,
      type: "application",
      language: app.language ?? "ts",
      ui: app.ui ?? "none",
      css: app.css ?? "none",
    });
    if (app.uiSmoke) planUiSmoke(options);
    if ((options.engine || options.engines) && !options.screen)
      throw new Error("批量引擎须同时配置 screen");
    const { type: _type, ...selection } = options;
    return { ...selection, uiSmoke: app.uiSmoke ?? false };
  });
  return { version: 1, name: input.name, apps };
}

export function validateBatchCliArgs(args) {
  for (const [key, value] of Object.entries(args)) {
    if (!["config", "dryRun"].includes(key) && value !== undefined && value !== false) {
      throw new Error("--config 只能与 --dry-run 同用，不能混用单项目参数或维护模式");
    }
  }
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") return false;
    throw error;
  }
}

async function checkDestination(cwd, root) {
  if (await exists(root)) throw new Error("批量目标已存在，拒绝覆盖：" + root);
  for (let current = cwd; ; current = dirname(current)) {
    if (await exists(join(current, "pnpm-workspace.yaml"))) {
      throw new Error("批量新建工作区须在已有工作区之外执行，请切换到仓库上级目录");
    }
    const manifestPath = join(current, "package.json");
    if (await exists(manifestPath)) {
      const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
      if (manifest.workspaces) throw new Error("不能在已有 workspace 内批量新建 Monorepo");
    }
    if (dirname(current) === current) break;
  }
}

export async function createBatchPlan(input, cwd = process.cwd()) {
  const config = validateBatchConfig(input);
  const parent = await realpath(cwd);
  const workspaceRoot = join(parent, config.name);
  await checkDestination(parent, workspaceRoot);
  const rootCommand = buildVpCommand({ name: config.name, type: "monorepo" });
  const steps = [
    {
      kind: "workspace",
      label: "工作区 " + config.name,
      cwd: parent,
      target: workspaceRoot,
      ...rootCommand,
      args: [...rootCommand.args, "--no-interactive"],
    },
  ];
  for (const app of config.apps) {
    const options = { ...app, type: "application", workspace: workspaceRoot };
    const args = [
      cliPath,
      "--workspace",
      workspaceRoot,
      "--name",
      app.name,
      "--type",
      "application",
      "--framework",
      app.framework,
      "--language",
      app.language,
      "--ui",
      app.ui,
      "--css",
      app.css,
    ];
    const uiArgs = [...args];
    if (app.engine) args.push("--engine", app.engine);
    if (app.engines) args.push("--engines", app.engines.join(","));
    if (app.modelProtection !== undefined) args.push("--model-protection", app.modelProtection);
    if (app.screen)
      args.push(
        "--screen",
        "--screen-width",
        String(app.screen.designWidth),
        "--screen-height",
        String(app.screen.designHeight),
        "--screen-mode",
        app.screen.mode,
      );
    steps.push({
      kind: "application",
      label: "应用 " + app.name,
      name: app.name,
      cwd: parent,
      target: join(workspaceRoot, "apps", app.name),
      command: process.execPath,
      args,
      official: { ...buildVpCommand(options), cwd: workspaceRoot },
      integrations: planIntegrations(options),
      ...(planModelProtection(options) ? { modelProtection: planModelProtection(options) } : {}),
      ...(app.engine || app.engines
        ? {
            engine: {
              ...(await planEngine(options)),
            },
          }
        : {}),
      ...(app.screen
        ? {
            screen: {
              options: app.screen,
              files: Object.keys((await planScreenPreset(options)).files),
              previewPath: "/screen-smoke.html",
            },
          }
        : {}),
    });
    if (app.uiSmoke)
      steps.push({
        kind: "ui-smoke",
        label: "验收页 " + app.name,
        name: app.name,
        cwd: parent,
        target: join(workspaceRoot, "apps", app.name, "ui-smoke.html"),
        command: process.execPath,
        args: [...uiArgs, "--ui-smoke"],
        previewPath: "/ui-smoke.html",
        files: Object.keys(planUiSmoke(options).files),
      });
  }
  return { config, cwd: parent, workspaceRoot, steps };
}

export async function loadBatchPlan(filename, cwd = process.cwd()) {
  const configFile = resolve(cwd, filename);
  const metadata = await stat(configFile);
  if (!metadata.isFile() || metadata.size > maxConfigBytes)
    throw new Error("批量配置必须是小于等于 1 MiB 的 JSON 文件");
  let config;
  try {
    config = JSON.parse((await readFile(configFile, "utf8")).replace(/^\uFEFF/, ""));
  } catch {
    throw new Error("批量配置不是有效 JSON：" + configFile);
  }
  return { ...(await createBatchPlan(config, cwd)), configFile };
}

function runStep(step) {
  if (step.kind === "workspace") return runWorkspaceVp(step.cwd, step.args);
  // Use argv rather than a shell for paths/config values, including spaces and metacharacters.
  const result = spawnSync(process.execPath, step.args, { cwd: step.cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw new Error("子进程失败，退出码：" + (result.status ?? result.signal ?? "unknown"));
}

async function checkCreatedRoot(root) {
  const info = await lstat(root);
  if (!info.isDirectory() || info.isSymbolicLink() || (await realpath(root)) !== root) {
    throw new Error("批量根目录不是预期的真实目录，拒绝继续");
  }
}

export async function executeBatch(plan, runner = runStep, report = console.log) {
  // Rebuild rather than trusting a stale/mutated dry-run plan or an output directory created since preview.
  const current = await createBatchPlan(plan.config, plan.cwd);
  const completed = [];
  let index = 0;
  let phase = current.steps[0].label;
  try {
    report("开始：" + phase);
    await runner(current.steps[0]);
    completed.push(phase);
    phase = "官方根生成后的全部应用预检";
    await checkCreatedRoot(current.workspaceRoot);
    for (const app of current.config.apps) {
      const context = await resolveWorkspaceApplication({
        ...app,
        type: "application",
        workspace: current.workspaceRoot,
      });
      if (context.exists) throw new Error("官方根已包含目标应用：" + app.name);
    }
    for (index = 1; index < current.steps.length; index++) {
      phase = current.steps[index].label;
      await checkCreatedRoot(current.workspaceRoot);
      report("开始：" + phase);
      await runner(current.steps[index]);
      completed.push(phase);
    }
  } catch (cause) {
    const remaining = current.steps.slice(index + 1);
    const pending = remaining.map((step) => step.label);
    const recovery = pendingRecovery(remaining);
    const error = new Error(
      `批量生成失败：${phase}；${cause.message}\n已完成：${completed.join("、") || "无"}\n未执行：${pending.join("、") || "无"}\n已生成内容保留在 ${current.workspaceRoot}，当前失败阶段可能部分完成；不会自动删除、覆盖或回滚。`,
      { cause },
    );
    Object.assign(error, {
      completed,
      failed: phase,
      pending,
      workspaceRoot: current.workspaceRoot,
    });
    error.recovery = { mode: "manual", pending: recovery };
    error.message +=
      "\n" +
      recoveryAdvice +
      "\n若根目录已存在，不要重跑相同 batch；若不存在，确认无残留后重新规划。修复失败阶段并确认工作区完整后，按顺序处理以下未执行步骤；以下命令未经现场可执行性确认：\n" +
      recovery
        .map((step) => step.label + "\n工作目录：" + step.cwd + "\nPowerShell：" + step.powershell)
        .join("\n");
    throw error;
  }
  return { workspaceRoot: current.workspaceRoot, completed };
}
