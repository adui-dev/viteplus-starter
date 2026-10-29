import { dirname } from "node:path";
import { inspectWorkspace, readExpectedConfig } from "./workspace-inspect.mjs";
import { resolveWorkspaceApplication } from "./workspace.mjs";
import { applicationInvocations } from "./application-invocations.mjs";
import { pendingRecovery } from "./recovery.mjs";

export async function planWorkspaceRecovery(directory, configFile) {
  if (!configFile) throw new Error("--plan-recovery 必须提供 --config 原批量 JSON");
  const config = await readExpectedConfig(configFile);
  return planRecoveryForConfig(directory, config);
}

export async function planRecoveryForConfig(directory, config) {
  const inspection = await inspectWorkspace(directory, undefined, config);
  const rootIssues = [
    ...inspection.issues,
    ...inspection.members.flatMap((member) =>
      member.problems.map((issue) => member.path + "：" + issue),
    ),
  ];
  const apps = [];
  for (const [index, app] of config.apps.entries()) {
    const state = inspection.apps[index];
    const reasons = [...rootIssues, ...state.issues];
    const manual = () => ({ name: app.name, action: "manual-review", reasons, steps: [] });
    if (rootIssues.length || state.status === "blocked") {
      apps.push(manual());
      continue;
    }
    if (state.status === "present") {
      apps.push({
        name: app.name,
        action: "validate-existing",
        reasons: [],
        steps: pendingRecovery([
          {
            label: "检查已有应用",
            cwd: inspection.root + "/apps/" + app.name,
            command: "vp",
            args: ["check"],
          },
          {
            label: "构建已有应用",
            cwd: inspection.root + "/apps/" + app.name,
            command: "vp",
            args: ["run", "build"],
          },
        ]),
      });
      continue;
    }
    try {
      const context = await resolveWorkspaceApplication({
        ...app,
        type: "application",
        workspace: inspection.root,
      });
      if (context.exists) throw new Error("规划期间应用目录已出现，需重新检查");
      const { args, uiArgs } = applicationInvocations(app, inspection.root);
      const steps = pendingRecovery([
        { label: "新建应用", cwd: dirname(inspection.root), command: process.execPath, args },
        ...(app.uiSmoke
          ? [
              {
                label: "新建 UI 验收页（应用创建并验证后）",
                cwd: dirname(inspection.root),
                command: process.execPath,
                args: [...uiArgs, "--ui-smoke"],
              },
            ]
          : []),
      ]).map((step, i) => ({
        ...step,
        requires:
          i === 0 ? "执行时目标目录仍须不存在" : "前一步完成，重新检查应用和验收页输出冲突后执行",
      }));
      apps.push({ name: app.name, action: "create-missing", reasons: [], steps });
    } catch (error) {
      reasons.push(error.message);
      apps.push(manual());
    }
  }
  return {
    root: inspection.root,
    readOnly: true,
    mode: "manual-plan",
    ok: apps.every((app) => app.action !== "manual-review"),
    apps,
    limitations:
      "仅生成操作指引，不执行任何步骤。执行前重新预检；缺失应用使用现有官方模板入口，新目录冲突仍拒绝。已有或部分完成应用不补写、不覆盖；结构存在不等于构建成功。",
  };
}
