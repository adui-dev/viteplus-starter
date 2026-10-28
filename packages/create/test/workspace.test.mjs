import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, realpath, symlink, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { buildVpCommand, validateProjectOptions } from "../src/options.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { generateIntegration } from "../src/integrations.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";
import {
  resolveWorkspaceApplication,
  updateWorkspaceDeclarationIgnore,
  validateWorkspacePackages,
  normalizeNewWorkspaceApplication,
  planWorkspacePeerExtensions,
  prepareWorkspacePeerExtensions,
} from "../src/workspace.mjs";

const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const options = {
  name: "console",
  type: "application",
  framework: "vue",
  ui: "tdesign",
  css: "unocss",
  workspace: ".",
};
const rootConfig =
  "import { defineConfig } from 'vite-plus'\nexport default defineConfig({fmt:{ignorePatterns:['existing/**']},run:{cache:true}})\n";

test("缺失 Vite peer 元数据增量合并，保留其他扩展与 catalog，重复调用不改写", () => {
  const source =
    "packages:\n  - apps/*\ncatalog:\n  vite: catalog-value\npackageExtensions:\n  'existing@*':\n    dependencies:\n      example: '^1'\n";
  const updated = planWorkspacePeerExtensions(source, options);
  assert.match(updated, /unplugin-vue-components@\*/);
  assert.match(updated, /unocss@\*/);
  assert.match(updated, /example: '\^1'/);
  assert.match(updated, /vite: catalog-value/);
  assert.equal(planWorkspacePeerExtensions(updated, options), updated);
  assert.equal(planWorkspacePeerExtensions(source, { framework: "react", ui: "antd" }), source);
  assert.throws(() => planWorkspacePeerExtensions("packageExtensions: {}", options), /安全合并/);
  assert.throws(
    () =>
      planWorkspacePeerExtensions(
        "packageExtensions:\n  'unocss@*':\n    peerDependencies:\n      vite: '^7'\n",
        options,
      ),
    /先确认/,
  );
  assert.throws(
    () => planWorkspacePeerExtensions("packageExtensions:\n  'unocss@^66': {}\n", options),
    /冲突/,
  );
});

test("peer 修复在预检后显式写入，拒绝期间变化的配置", async (t) => {
  const root = await fixture(t);
  const context = await resolveWorkspaceApplication(options, root);
  assert.notEqual(context.peerSource, context.peerUpdated);
  assert.equal(await readFile(context.workspacePath, "utf8"), context.peerSource);
  assert.equal(await prepareWorkspacePeerExtensions(context), true);
  const again = await resolveWorkspaceApplication(options, root);
  assert.equal(await prepareWorkspacePeerExtensions(again), false);
  await writeFile(context.workspacePath, context.peerSource + "# changed\n");
  await assert.rejects(prepareWorkspacePeerExtensions(context), /已改变/);
});

test("交互式工作区应用保留路径，确认中展示实际成员目标", async () => {
  const answers = ["console", "1", "2", "2", "2", "3", "1", "y"];
  const questions = [];
  const selected = await collectProjectOptions({ workspace: "../mixed" }, async (prompt) => {
    questions.push(prompt);
    return answers.shift();
  });
  assert.equal(selected.workspace, "../mixed");
  assert.deepEqual(
    [selected.framework, selected.language, selected.ui, selected.css],
    ["react", "js", "antd", "tailwindcss"],
  );
  assert.match(questions.at(-1), /mixed\/apps\/console/);
});

test("工作区修复只调用新应用配置的官方 lint/fmt，失败不继续", async (t) => {
  const root = await fixture(t);
  const target = join(root, "apps", "console");
  await mkdir(target);
  await writeFile(join(target, "vite.config.ts"), rootConfig);
  const calls = [];
  await normalizeNewWorkspaceApplication({ target }, (cwd, args) => calls.push({ cwd, args }));
  assert.deepEqual(calls, [
    { cwd: target, args: ["lint", "vite.config.ts", "--fix"] },
    { cwd: target, args: ["fmt", "vite.config.ts", "--write"] },
  ]);
  let attempted = 0;
  await assert.rejects(
    normalizeNewWorkspaceApplication({ target }, () => {
      attempted++;
      throw new Error("lint failed");
    }),
    /lint failed/,
  );
  assert.equal(attempted, 1);
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), rootConfig);
});

test("拒绝其他成员同名包（含 scope），且预检不改动根", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "packages", "other"), { recursive: true });
  await writeFile(join(root, "packages", "other", "package.json"), '{"name":"console"}');
  await assert.rejects(resolveWorkspaceApplication(options, root), /同名包/);
  await writeFile(
    join(root, "package.json"),
    '{"name":"@adui/root","private":true,"devDependencies":{"vite-plus":"catalog:"}}',
  );
  await writeFile(join(root, "packages", "other", "package.json"), '{"name":"@adui/console"}');
  await assert.rejects(resolveWorkspaceApplication(options, root), /同名包/);
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), rootConfig);
});

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "adui-workspace-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "apps"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ private: true, devDependencies: { "vite-plus": "catalog:" } }),
  );
  await writeFile(
    join(root, "pnpm-workspace.yaml"),
    "packages:\n  - apps/*\n  - 'packages/*'\n  - \"tools/*\"\n\ncatalog:\n  vite-plus: 1.4.0\n",
  );
  await writeFile(join(root, "vite.config.ts"), rootConfig);
  return root;
}

test("工作区参数保留路径，但官方命令只传安全的相对 apps 路径且不初始化 Git", () => {
  const parsed = parseCliArgs([
    "--workspace",
    "../a path",
    "--name",
    "console",
    "--type",
    "application",
    "--framework",
    "vue",
  ]);
  assert.equal(validateProjectOptions(parsed).workspace, "../a path");
  const command = buildVpCommand(parsed);
  assert.deepEqual(command.args, [
    "create",
    "vite:application",
    "--directory",
    "apps/console",
    "--package-manager",
    "pnpm",
    "--no-interactive",
    "--",
    "--template",
    "vue-ts",
  ]);
  assert.throws(() => parseCliArgs(["--workspace", ".", "--workspace", ".."]));
  assert.throws(() => parseCliArgs(["--workspace"]));
  for (const workspace of ["", " ", false, "\0"])
    assert.throws(() => validateProjectOptions({ ...options, workspace }));
  assert.throws(() => validateProjectOptions({ name: "repo", type: "monorepo", workspace: "." }));
  assert.throws(() => validateProjectOptions({ ...options, name: "../escape" }));
});

test("仅接受可确认 apps/* 成员关系的官方 YAML 列表", () => {
  validateWorkspacePackages("packages:\n  - 'apps/*' # apps\n  - packages/*\ncatalog: {}\n");
  for (const source of [
    "packages: [apps/*]",
    "packages:\n  - packages/*\n",
    'packages:\n  - apps/*\n  - "!apps/console"\n',
    "packages:\n  - apps/**\n",
    "packages:\n  - apps/*\npackages:\n  - packages/*\n",
    "packages:\n  - apps/*\n  exclude: console\n",
  ])
    assert.throws(() => validateWorkspacePackages(source));
});

test("预检不写文件，声明忽略规则在根增量合并且幂等", async (t) => {
  const root = await fixture(t);
  const context = await resolveWorkspaceApplication(options, root);
  assert.equal(context.root, await realpath(root));
  assert.equal(context.target, join(context.root, "apps", "console"));
  assert.equal(context.exists, false);
  assert.equal(await readFile(context.configPath, "utf8"), rootConfig);
  assert.equal(await updateWorkspaceDeclarationIgnore(context), true);
  const updated = await readFile(context.configPath, "utf8");
  assert.match(updated, /apps\/console\/src\/components\.d\.ts/);
  assert.match(updated, /existing\/\*\*/);
  assert.match(updated, /run:\{cache:true\}/);
  assert.equal(await updateWorkspaceDeclarationIgnore(context), false);
});

test("子应用 Vue TS 配置不加入根专用 fmt；JS/React 不改根忽略规则", async (t) => {
  const root = await fixture(t);
  const generated = generateIntegration(
    options,
    "export default defineConfig({plugins:[vue()]})",
    "",
  );
  assert.match(generated.config, /dts: 'src\/components.d.ts'/);
  assert.doesNotMatch(generated.config, /fmt:/);
  for (const selection of [
    { language: "js" },
    { framework: "react", ui: "antd", css: "tailwindcss" },
  ]) {
    const context = await resolveWorkspaceApplication({ ...options, ...selection }, root);
    assert.equal(await updateWorkspaceDeclarationIgnore(context), false);
  }
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), rootConfig);
});

test("拒绝普通项目、未知根配置和多个根配置", async (t) => {
  const root = await fixture(t);
  await writeFile(join(root, "package.json"), '{"private":true}');
  await assert.rejects(resolveWorkspaceApplication(options, root), /Vite\+/);
  await writeFile(
    join(root, "package.json"),
    '{"private":true,"devDependencies":{"vite-plus":"catalog:"}}',
  );
  await writeFile(join(root, "vite.config.ts"), "export default {}");
  await assert.rejects(resolveWorkspaceApplication(options, root), /defineConfig/);
  await writeFile(join(root, "vite.config.js"), "export default {}");
  await assert.rejects(resolveWorkspaceApplication(options, root), /唯一/);
});

test("拒绝 apps junction 和已有应用 junction", async (t) => {
  const root = await fixture(t);
  const outside = await mkdtemp(join(tmpdir(), "adui-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(
    outside,
    join(root, "apps", "console"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(resolveWorkspaceApplication(options, root), /链接|junction/);
  await rm(join(root, "apps", "console"));
  await rm(join(root, "apps"), { recursive: true });
  await symlink(outside, join(root, "apps"), process.platform === "win32" ? "junction" : "dir");
  await assert.rejects(resolveWorkspaceApplication(options, root), /链接|junction/);
});

test("真实 CLI dry-run 显示工作区 cwd；已有目录创建失败且不覆盖文件", async (t) => {
  const root = await fixture(t);
  const args = [
    cli,
    "--workspace",
    root,
    "--name",
    "console",
    "--type",
    "application",
    "--framework",
    "vue",
    "--ui",
    "tdesign",
  ];
  const preview = spawnSync(process.execPath, [...args, "--dry-run"], {
    cwd: resolve("."),
    encoding: "utf8",
  });
  assert.equal(preview.status, 0, preview.stderr);
  const plan = JSON.parse(preview.stdout);
  assert.equal(plan.target, join(plan.cwd, "apps", "console"));
  await mkdir(join(root, "apps", "console"));
  await writeFile(join(root, "apps", "console", "keep.txt"), "keep");
  const actual = spawnSync(process.execPath, args, { encoding: "utf8" });
  assert.equal(actual.status, 1);
  assert.match(actual.stderr, /已存在/);
  assert.equal(await readFile(join(root, "apps", "console", "keep.txt"), "utf8"), "keep");
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), rootConfig);
});

test("新 Vue JS 成员隔离声明作用域，保留已有项目配置及官方 env 声明", async (t) => {
  const root = await fixture(t),
    target = join(root, "apps", "vue-js");
  await mkdir(join(target, "src"), { recursive: true });
  await writeFile(join(target, "vite.config.js"), rootConfig);
  const shim = 'declare module "*.vue" { const component: unknown; export default component; }';
  await writeFile(join(target, "src/env.d.ts"), shim);
  const calls = [];
  await normalizeNewWorkspaceApplication({ target }, (_cwd, args) => calls.push(args), {
    framework: "vue",
    language: "js",
  });
  const config = JSON.parse(await readFile(join(target, "tsconfig.json"), "utf8"));
  assert.equal(config.compilerOptions.moduleResolution, "bundler");
  assert.deepEqual(config.include, ["src/**/*", "vite.config.js"]);
  assert.equal(config.compilerOptions.skipLibCheck, undefined);
  assert.equal(config.compilerOptions.checkJs, undefined);
  assert.equal(await readFile(join(target, "src/env.d.ts"), "utf8"), shim);
  await writeFile(join(target, "tsconfig.json"), "user config");
  await normalizeNewWorkspaceApplication({ target }, () => {}, {
    framework: "vue",
    language: "js",
  });
  assert.equal(await readFile(join(target, "tsconfig.json"), "utf8"), "user config");
  assert.equal(calls.length, 3);
});
