import { spawnSync } from "node:child_process";
import { dirname, join } from "node:path";
import { readExpectedConfig, inspectWorkspace } from "./workspace-inspect.mjs";
import { planRecoveryForConfig } from "./workspace-recovery.mjs";
import { resolveWorkspaceApplication } from "./workspace.mjs";
import { applicationInvocations } from "./application-invocations.mjs";
import { preflightUiSmoke } from "./ui-smoke.mjs";
import { recoveryAdvice } from "./recovery.mjs";

function run(step) {
  // Only reconstructed argv reaches a child; never execute a saved plan or PowerShell text.
  const result = spawnSync(process.execPath, step.args, { cwd: step.cwd, stdio: "inherit" });
  if (result.error) throw result.error;
  if (result.status !== 0)
    throw Object.assign(new Error("子进程失败：" + (result.signal ?? result.status ?? "unknown")), {
      exitCode: result.status ?? 1,
    });
}

export async function executeWorkspaceRecovery(
  directory,
  configFile,
  runner = run,
  report = console.log,
) {
  if (!configFile) throw new Error("--execute-recovery 必须提供 --config 原批量 JSON");
  const config = await readExpectedConfig(configFile);
  const initial = await planRecoveryForConfig(directory, config);
  if (!initial.ok)
    throw new Error("恢复执行预检存在人工阻塞，未启动任何步骤；请先运行 --plan-recovery 检查原因");
  const selected = initial.apps
    .filter((app) => app.action === "create-missing")
    .map((app) => app.name);
  const skipped = initial.apps
    .filter((app) => app.action !== "create-missing")
    .map((app) => app.name);
  const completed = [];
  let phase = "执行前预检";
  try {
    for (const name of selected) {
      phase = "新建应用 " + name;
      const current = await planRecoveryForConfig(initial.root, config);
      if (!current.ok || current.apps.find((app) => app.name === name)?.action !== "create-missing")
        throw new Error("现场已变化或出现阻塞，拒绝继续创建");
      const app = config.apps.find((app) => app.name === name),
        options = { ...app, type: "application", workspace: initial.root };
      const context = await resolveWorkspaceApplication(options);
      if (context.exists) throw new Error("目标已存在，拒绝覆盖");
      const { args, uiArgs } = applicationInvocations(app, initial.root);
      const step = { label: phase, cwd: dirname(initial.root), target: context.target, args };
      report("开始：" + phase);
      await runner(step);
      completed.push(phase);
      phase = "检查新建应用 " + name;
      async function check(uiSmoke) {
        const status = await inspectWorkspace(initial.root, undefined, {
          ...config,
          apps: [{ ...app, uiSmoke }],
        });
        if (!status.ok)
          throw new Error(
            "新建应用结构检查未通过：" +
              JSON.stringify({ issues: status.issues, apps: status.apps }),
          );
      }
      await check(false);
      if (app.uiSmoke) {
        phase = "UI 验收页 " + name;
        await preflightUiSmoke(join(initial.root, "apps", name), options);
        report("开始：" + phase);
        await runner({
          label: phase,
          cwd: dirname(initial.root),
          target: context.target,
          args: [...uiArgs, "--ui-smoke"],
        });
        completed.push(phase);
        phase = "检查 UI 验收页 " + name;
        await check(true);
      }
    }
  } catch (cause) {
    const error = new Error(
      `恢复执行失败：${phase}；${cause?.message ?? String(cause)}\n工作区：${initial.root}\n已完成子进程：${completed.join("、") || "无"}\n${recoveryAdvice}`,
      { cause },
    );
    if (Number.isInteger(cause?.exitCode) && cause.exitCode > 0) error.exitCode = cause.exitCode;
    Object.assign(error, {
      failed: phase,
      completed: [...completed],
      skipped,
      workspaceRoot: initial.root,
    });
    throw error;
  }
  return {
    root: initial.root,
    mode: "create-missing-only",
    completed,
    skipped,
    validation:
      "已进行结构检查；请在各应用目录另行运行 vp check、vp run build 及适用的页面验收；工作区根使用 vp run ready。",
  };
}
