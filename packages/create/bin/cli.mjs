#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import { basename, join, resolve } from "node:path";
import { stdin, stdout } from "node:process";
import { createInterface } from "node:readline/promises";
import { parseCliArgs } from "../src/cli-args.mjs";
import { buildVpCommand, validateProjectOptions } from "../src/options.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";
import { inspectPath } from "../src/safe-paths.mjs";
import { addCesium, preflightCesium } from "../src/cesium.mjs";
import { planEngine } from "../src/engine.mjs";
import {
  planModelProtection,
  preflightModelProtection,
  addModelProtection,
} from "../src/model-protection.mjs";
import {
  applyIntegrations,
  planIntegrations,
  repairExistingIntegrations,
} from "../src/integrations.mjs";
import { addUiSmoke } from "../src/ui-smoke.mjs";
import {
  addThreeSmoke,
  planThreeSmoke,
  preflightThreeSmoke,
  validateThreeTarget,
} from "../src/three-smoke.mjs";
import { addScreenPreset, planScreenPreset, preflightScreenPreset } from "../src/screen.mjs";
import { loadBatchPlan, executeBatch, validateBatchCliArgs } from "../src/batch.mjs";
import {
  normalizeNewWorkspaceApplication,
  prepareWorkspacePeerExtensions,
  resolveWorkspaceApplication,
  runWorkspaceVp,
  updateWorkspaceDeclarationIgnore,
} from "../src/workspace.mjs";

const usage = `ADui Vite+ Starter（Application / Monorepo）

用法：
  node packages/create/bin/cli.mjs
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue
  node packages/create/bin/cli.mjs --name my-react-app --type application --framework react
  node packages/create/bin/cli.mjs --name my-vue-js-app --type application --framework vue --language js
  node packages/create/bin/cli.mjs --name my-react-js-app --type application --framework react --language js
  node packages/create/bin/cli.mjs --name my-workspace --type monorepo
  node packages/create/bin/cli.mjs --config ./monorepo.json --dry-run
  node packages/create/bin/cli.mjs --config ./monorepo.json
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss --apply-existing
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss --repair-existing
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --ui tdesign --css unocss --ui-smoke
  node packages/create/bin/cli.mjs --name my-vue-app --type application --framework vue --dry-run

说明：
  Application 委托 Vite+ 官方 vite:application，按框架和语言选择 vue/vue-ts/react/react-ts。
  --language ts|js（默认 ts）；Monorepo 根不指定语言。
  --screen：生成 AdScreen 大屏插件及 /screen-smoke.html，保留正式首页。
  --screen-width / --screen-height：设计尺寸，默认 1920 / 1080。
  --screen-mode contain|cover|stretch|none：默认 contain；已有项目配合 --apply-existing。
  --three-smoke：向已有 --screen 应用安装 Three.js 并生成 /three-smoke.html。
  --engine none|three|cesium：按应用集成引擎；新建时同时指定 --screen。
  --model-protection embedded|external|none：Three 默认 embedded；可选择外置密钥或关闭。
  启用模型保护时自动生成项目 .env.local 与 models:keygen / models:keyrotate 脚本，IV 按模型随机生成。
  --config <JSON 文件>：批量新建官方 Monorepo 和应用，仅可与 --dry-run 同用。
  --workspace <已有工作区路径>：在官方 pnpm Monorepo 的 apps/<name> 中添加 Application。
  例：--workspace ../my-workspace --name admin --type application --framework vue --ui tdesign --css unocss
  Monorepo 使用官方 vite:monorepo；子应用的框架需分别选择。
  无参数时交互选择名称、形态、框架、语言、UI/CSS、大屏、引擎和模型保护，并二次确认。
  --dry-run 只输出命令；必须提供全部必需参数，且不创建文件。
  UI/CSS 集成支持 None、Element Plus、Ant Design、TDesign、UnoCSS、Tailwind CSS。
  --apply-existing 用于首次补装；--repair-existing 用于修复旧版 starter.plugins 跨文件引用。
  旧插件文件会备份成 starter.plugins.ts.bak；两种模式不重装基础模板。
  --ui-smoke 为已有应用创建独立的 /ui-smoke.html 验证页，不修改正式首页。
  大屏、Three.js 与 Cesium 独立验收页已支持；Babylon 尚未实现。
`;

async function main() {
  const args = parseCliArgs(process.argv.slice(2));
  if (args.help) {
    console.log(usage);
    return;
  }
  if (args.config !== undefined) {
    validateBatchCliArgs(args);
    const plan = await loadBatchPlan(args.config);
    if (args.dryRun) {
      console.log(JSON.stringify(plan, null, 2));
    } else {
      const result = await executeBatch(plan);
      console.log("批量生成完成：" + result.workspaceRoot);
      console.log("已完成：" + result.completed.join("、"));
      console.log("进入工作区运行 vp run ready；组件效果仍需浏览器验收");
    }
    return;
  }

  const incomplete = !args.name || !args.type || (args.type === "application" && !args.framework);
  let options;
  if (incomplete) {
    if (args.dryRun || !stdin.isTTY) {
      throw new Error(
        "非交互或 --dry-run 模式必须提供 --name、--type，以及 Application 的 --framework",
      );
    }
    const rl = createInterface({ input: stdin, output: stdout });
    try {
      options = await collectProjectOptions(args, (prompt) => rl.question(prompt));
    } finally {
      rl.close();
    }
    if (options === null) {
      console.log("已取消创建，未修改任何项目文件");
      return;
    }
  } else {
    options = validateProjectOptions(args);
  }

  const { command, args: vpArgs } = buildVpCommand(options);
  if (options.engine && (args.uiSmoke || args.threeSmoke || args.repairExisting))
    throw new Error("--engine 不能与独立验收/旧版修复模式混用");
  if (options.engine && !options.screen && !args.applyExisting)
    throw new Error("新建引擎应用须同时指定 --screen");
  if (options.screen && (args.uiSmoke || args.repairExisting))
    throw new Error("--screen 不能与 --ui-smoke 或 --repair-existing 同用");
  const integrations = planIntegrations(options);
  if (options.workspace && args.repairExisting)
    throw new Error("--workspace 不支持旧版 --repair-existing");
  const workspace = options.workspace ? await resolveWorkspaceApplication(options) : null;
  const commandCwd = workspace?.root ?? process.cwd();
  const target = workspace?.target ?? resolve(process.cwd(), options.name);
  await inspectPath(target);
  if (!args.dryRun && !args.applyExisting) await preflightModelProtection(target, options);
  async function finishWorkspaceIntegration() {
    if (!workspace) return;
    if (await updateWorkspaceDeclarationIgnore(workspace)) {
      runWorkspaceVp(commandCwd, ["fmt", basename(workspace.configPath), "--write"]);
    }
    runWorkspaceVp(commandCwd, ["fmt", "pnpm-workspace.yaml", "--write"]);
  }
  if (args.threeSmoke) {
    if (
      args.dryRun ||
      args.uiSmoke ||
      args.applyExisting ||
      args.repairExisting ||
      options.screen ||
      (options.ui ?? "none") !== "none" ||
      (options.css ?? "none") !== "none"
    )
      throw new Error("--three-smoke 需单独调用，不混用创建/补装/其他验收选项");
    const result = await addThreeSmoke(target, options);
    await finishWorkspaceIntegration();
    console.log("Three.js 验收页已生成：" + result.previewPath);
    console.log("运行 vp check、vp dev；验证真实 WebGL、DPR、拾取与卸载清理");
    return;
  }
  if (args.uiSmoke) {
    if (args.dryRun || args.applyExisting || args.repairExisting) {
      throw new Error("--ui-smoke 不能与 --dry-run、--apply-existing、--repair-existing 同时使用");
    }
    if (!existsSync(target)) throw new Error("目标目录不存在，请先创建 Application");
    const result = await addUiSmoke(target, options);
    console.log("UI Smoke 验证页已生成：" + result.previewPath);
    console.log("进入项目运行 vp dev，访问 http://localhost:5173" + result.previewPath);
    console.log("确认组件按钮可见、点击计数增加，以及 CSS 区域显示预期颜色");
    return;
  }
  if (args.repairExisting && args.applyExisting) {
    throw new Error("--repair-existing 不能和 --apply-existing 同时使用");
  }
  if (args.repairExisting) {
    if (args.dryRun) throw new Error("--repair-existing 与 --dry-run 不能同时使用");
    if (options.type !== "application") throw new Error("仅支持 Application 的旧版配置修复");
    if (!existsSync(target)) throw new Error("目标目录不存在，无法修复");
    const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    if (!dependencies["vite-plus"] || !dependencies[options.framework]) {
      throw new Error("目标项目与所选 Vue/React 不匹配，拒绝修复");
    }
    await repairExistingIntegrations(target, options);
    console.log("旧版插件引用修复完成，旧文件已备份，请运行 vp check 和 vp build");
    return;
  }
  if (args.applyExisting) {
    if (args.dryRun) throw new Error("--apply-existing 与 --dry-run 不能同时使用");
    if (options.type !== "application") throw new Error("只能向已存在的 Application 补装插件");
    if (!existsSync(target)) throw new Error("目标目录不存在，无法补装");
    const manifest = JSON.parse(await readFile(join(target, "package.json"), "utf8"));
    const dependencies = { ...manifest.dependencies, ...manifest.devDependencies };
    if (!dependencies["vite-plus"] || !dependencies[options.framework]) {
      throw new Error("现有目录不是所选 Vite+ Vue/React 应用，拒绝修改");
    }
    if (
      !integrations.dependencies.length &&
      !integrations.devDependencies.length &&
      !options.screen &&
      !options.engine
    ) {
      throw new Error("未选择需要安装的 UI/CSS 集成");
    }
    if (options.screen) await preflightScreenPreset(target, await planScreenPreset(options));
    if (options.engine === "cesium") await preflightCesium(target, options, !options.screen);
    if (options.engine === "three") {
      await preflightThreeSmoke(target, await planThreeSmoke(options));
      await validateThreeTarget(target, options, !options.screen);
    }
    await preflightModelProtection(target, options);
    if (workspace) await prepareWorkspacePeerExtensions(workspace);
    await applyIntegrations(target, options);
    if (options.screen) await addScreenPreset(target, options);
    if (options.engine === "three") await addThreeSmoke(target, options);
    if (options.engine === "cesium") await addCesium(target, options);
    await addModelProtection(target, options);
    await finishWorkspaceIntegration();
    console.log("补装完成，请在项目中执行 vp check 和 vp build");
    return;
  }
  if (existsSync(target) && !args.dryRun) {
    throw new Error(`目标目录已存在: ${options.name}，为保护文件已终止`);
  }

  if (args.dryRun) {
    console.log(
      JSON.stringify(
        {
          command,
          args: vpArgs,
          ...(workspace ? { cwd: commandCwd, target } : {}),
          integrations,
          ...(planModelProtection(options)
            ? { modelProtection: planModelProtection(options) }
            : {}),
          ...(options.engine
            ? {
                engine: {
                  ...(await planEngine(options)),
                },
              }
            : {}),
          ...(options.screen
            ? {
                screen: {
                  options: options.screen,
                  files: Object.keys((await planScreenPreset(options)).files),
                  previewPath: "/screen-smoke.html",
                },
              }
            : {}),
        },
        null,
        2,
      ),
    );
    return;
  }

  console.log(
    options.type === "application"
      ? `调用 Vite+ 官方 Application 模板，框架：${options.framework}，语言：${options.language ?? "ts"}`
      : "调用 Vite+ 官方 Monorepo 模板",
  );

  if (workspace) await prepareWorkspacePeerExtensions(workspace);

  // Windows 的 vp 通常是 .cmd shim；所有值在构造命令前均被白名单校验。
  // 以单个 shell 命令执行，避免 Node.js 24 在 shell:true + args[] 时的 DEP0190。
  const result =
    process.platform === "win32"
      ? spawnSync([command, ...vpArgs].join(" "), {
          cwd: commandCwd,
          stdio: "inherit",
          shell: true,
        })
      : spawnSync(command, vpArgs, { cwd: commandCwd, stdio: "inherit" });

  if (result.error) throw result.error;
  if (result.status === 0 && workspace)
    await normalizeNewWorkspaceApplication(workspace, undefined, options);
  if (
    result.status === 0 &&
    (integrations.dependencies.length || integrations.devDependencies.length)
  ) {
    console.log("正在安装和配置所选 UI/CSS 插件...");
    await applyIntegrations(target, options);
    console.log("UI/CSS 插件配置已写入，请运行 vp check 和 vp build 验证");
  }
  if (result.status === 0) await finishWorkspaceIntegration();
  if (result.status === 0 && options.screen) {
    await addScreenPreset(target, options);
    console.log("AdScreen 大屏预设已生成：/screen-smoke.html");
  }
  if (result.status === 0 && options.engine) {
    if (options.engine === "three") await addThreeSmoke(target, options);
    if (options.engine === "cesium") await addCesium(target, options);
    await finishWorkspaceIntegration();
    console.log(
      "引擎按需场景已生成：" +
        (options.engine === "cesium" ? "/cesium-smoke.html" : "/three-smoke.html"),
    );
  }
  if (result.status === 0 && planModelProtection(options)) {
    await addModelProtection(target, options);
    console.log(
      "模型保护已配置：/model-smoke.html；KEY 已写入被忽略的 .env.local，IV 按模型自动随机生成。",
    );
    console.log("运行 vp run models:keygen 或 vp run models:keyrotate 管理 KEY；轮换后重新构建。");
  }
  if (result.signal) {
    process.exitCode = 1;
  } else if (result.status !== 0) {
    process.exitCode = result.status ?? 1;
  }
}

main().catch((error) => {
  console.error(`创建失败: ${error.message}`);
  process.exitCode = 1;
});
