import { spawnSync } from "node:child_process";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { validateProjectOptions, buildVpCommand, modelEngine } from "./options.mjs";
import { planEngine } from "./engine.mjs";
import { resolveWorkspaceApplication } from "./workspace.mjs";
import { inspectPath } from "./safe-paths.mjs";
import { preflightCesium } from "./cesium.mjs";
import { preflightBabylon } from "./babylon.mjs";
import { planThreeSmoke, preflightThreeSmoke, validateThreeTarget } from "./three-smoke.mjs";
import { preflightModelProtection, planModelProtection } from "./model-protection.mjs";
export async function runMultiEngine(args, runner = run) {
  const options = validateProjectOptions(args);
  for (const key of ["uiSmoke", "threeSmoke", "repairExisting", "config"])
    if (args[key]) throw new Error("多引擎不能混用独立验收或修复模式");
  if (!options.screen && !args.applyExisting) throw new Error("多引擎新建需要 --screen");
  if (args.applyExisting && args.dryRun) throw new Error("补装不能与 dry-run 混用");
  const context = options.workspace ? await resolveWorkspaceApplication(options) : null;
  const target = context?.target ?? resolve(options.name);
  const existing = await inspectPath(target);
  if (!args.dryRun && Boolean(existing) !== Boolean(args.applyExisting))
    throw new Error("目标已存在或缺失，拒绝创建/补装");
  const plan = await planEngine(options);
  const selections = options.engines.map((engine) => ({
    ...options,
    engines: undefined,
    engine,
    modelProtection: engine === modelEngine(options) ? options.modelProtection : "none",
  }));
  if (args.applyExisting) {
    await preflightModelProtection(target, options);
    for (const selection of selections) {
      if (selection.engine === "three") {
        await preflightThreeSmoke(target, await planThreeSmoke(selection));
        await validateThreeTarget(target, selection, !options.screen);
      }
      if (selection.engine === "cesium") await preflightCesium(target, selection, !options.screen);
      if (selection.engine === "babylon")
        await preflightBabylon(target, selection, !options.screen);
    }
  }
  if (args.dryRun)
    return {
      official: buildVpCommand(options),
      engine: plan,
      modelProtection: planModelProtection(options),
    };
  for (const [index, selection] of selections.entries()) {
    const argv = [
      "--name",
      options.name,
      "--type",
      "application",
      "--framework",
      options.framework,
      "--language",
      options.language ?? "ts",
      "--engine",
      selection.engine,
      "--model-protection",
      selection.modelProtection ?? "none",
    ];
    if (options.workspace) argv.push("--workspace", options.workspace);
    if (index === 0) {
      argv.push("--ui", options.ui ?? "none", "--css", options.css ?? "none");
      if (options.screen)
        argv.push(
          "--screen",
          "--screen-width",
          String(options.screen.designWidth),
          "--screen-height",
          String(options.screen.designHeight),
          "--screen-mode",
          options.screen.mode,
        );
    }
    if (index > 0 || args.applyExisting) argv.push("--apply-existing");
    try {
      await runner(argv);
    } catch (cause) {
      throw new Error(
        "多引擎阶段失败：" + selection.engine + "；已完成文件保留，不自动回滚。" + cause.message,
        { cause },
      );
    }
  }
  return { target, engine: plan };
}
function run(argv) {
  const result = spawnSync(
    process.execPath,
    [fileURLToPath(new URL("../bin/cli.mjs", import.meta.url)), ...argv],
    { stdio: "inherit" },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error("退出码 " + result.status);
}
