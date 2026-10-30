export const recoveryAdvice =
  "失败阶段可能部分完成，依赖、配置备份和文件均保留；不会自动删除、覆盖、回滚或续跑。" +
  "先检查目标目录及 Git diff，修复原因后，在已完整生成的应用目录运行 vp check 和 vp run build；官方工作区根使用 vp run ready。" +
  "只有确认尚未写入相应预设时才使用 --apply-existing；验收页已有文件时拒绝重建。";

export function createStageRunner(target) {
  const completed = [];
  return async (stage, action) => {
    try {
      const value = await action();
      completed.push(stage);
      return value;
    } catch (cause) {
      const error = new Error(
        `阶段：${stage}；${cause?.message ?? String(cause)}\n目标：${target}\n已完成：${completed.join("、") || "无"}\n${recoveryAdvice}`,
        { cause },
      );
      Object.assign(error, { failed: stage, target, completed: [...completed] });
      if (Number.isInteger(cause?.exitCode) && cause.exitCode > 0) error.exitCode = cause.exitCode;
      throw error;
    }
  };
}

// These are reviewable instructions, never shell-executed by the recovery code.
export function pendingRecovery(steps) {
  const quote = (value) => "'" + String(value).replaceAll("'", "''") + "'";
  return steps.map((step) => ({
    label: step.label,
    cwd: step.cwd,
    command: step.command,
    args: [...step.args],
    powershell: "& " + [step.command, ...step.args].map(quote).join(" "),
  }));
}
