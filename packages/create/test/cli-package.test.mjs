import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtemp, mkdir, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { stageCliPackage } from "../../../scripts/cli-package.mjs";

async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "adui-cli-package-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("adui-cli-package-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test("CLI 本地包保留资源与官方提示依赖，不带测试或生命周期脚本", async (t) => {
  const root = await fixture(t);
  const directory = join(root, "package");
  const manifest = await stageCliPackage(directory);
  assert.equal(manifest.name, "@adui/viteplus-starter");
  assert.equal(manifest.private, true);
  assert.equal(manifest.bin["viteplus-starter"], "packages/create/bin/cli.mjs");
  assert.deepEqual(manifest.dependencies, { "@voidzero-dev/vite-plus-prompts": "1.4.0" });
  assert.equal(manifest.scripts, undefined);
  const paths = await readdir(directory, { recursive: true });
  assert.ok(paths.length > 50);
  for (const path of paths)
    assert.doesNotMatch(
      path,
      /(?:^|[\\/])(?:node_modules|test|\.git|\.env[^\\/]*)|\.(?:glb|adui|tgz)$/,
    );
  const repository = fileURLToPath(new URL("../../../", import.meta.url));
  for (const path of [
    "packages/create/bin/cli.mjs",
    "packages/create/assets/normalize.css",
    "packages/create/assets/normalize.LICENSE.txt",
    "packages/model-security/src/project-key.mjs",
    "packages/model-security/src/setup.mjs",
    "packages/screen/src/vue.d.mts",
    "packages/three/src/index.mjs",
    "packages/cesium/src/vite.mjs",
    "packages/babylon/src/lazy.mjs",
  ])
    assert.deepEqual(await readFile(join(directory, path)), await readFile(join(repository, path)));
});

test("隔离 CLI 包从调用目录预览 Vue/React 全部引擎与 JSON 批量，不依赖仓库外资源", async (t) => {
  const root = await fixture(t);
  const directory = join(root, "安装 包 & 'cli");
  await stageCliPackage(directory);
  const cli = join(directory, "packages/create/bin/cli.mjs");
  const cwd = join(root, "调用 目录 & 'work");
  await mkdir(cwd);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const [framework, language, ui, css] of [
    ["vue", "ts", "element-plus", "tailwindcss"],
    ["react", "js", "antd", "unocss"],
  ]) {
    const result = spawnSync(
      process.execPath,
      [
        cli,
        "--name",
        "new-app",
        "--type",
        "application",
        "--framework",
        framework,
        "--language",
        language,
        "--ui",
        ui,
        "--css",
        css,
        "--screen",
        "--engines",
        "three,cesium,babylon",
        "--dry-run",
      ],
      { cwd, env, encoding: "utf8", timeout: 10000 },
    );
    assert.equal(result.status, 0, result.stderr);
    const plan = JSON.parse(result.stdout);
    assert.equal(plan.cwd, cwd);
    assert.equal(plan.target, join(cwd, "new-app"));
    assert.equal(plan.official.args[1], "vite:application");
    assert.equal(plan.official.args.at(-1), framework + (language === "ts" ? "-ts" : ""));
    assert.equal(plan.engine.entry, "/");
    assert.equal(plan.engine.previews, undefined);
    assert.equal(plan.modelProtection.mode, "embedded");
  }
  const config = join(root, "批量 配置.json");
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      name: "workspace",
      apps: [
        {
          name: "admin",
          framework: "vue",
          ui: "element-plus",
          css: "tailwindcss",
          screen: true,
          engine: "three",
        },
        { name: "portal", framework: "react", language: "js", ui: "antd", css: "unocss" },
      ],
    }),
  );
  const result = spawnSync(process.execPath, [cli, "--config", config, "--dry-run"], {
    cwd,
    env,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  const plan = JSON.parse(result.stdout);
  assert.equal(plan.steps[0].args[1], "vite:monorepo");
  for (const step of plan.steps.filter((step) => step.kind === "application"))
    assert.equal(step.args[0], cli);
  assert.deepEqual(await readdir(cwd), []);
});

test("CLI 暂存拒绝已有目录与 junction，不覆盖输出或写入站外目录", async (t) => {
  const root = await fixture(t);
  const existing = join(root, "existing");
  await mkdir(existing);
  await writeFile(join(existing, "keep.txt"), "original");
  await assert.rejects(stageCliPackage(existing), { code: "EEXIST" });
  assert.deepEqual(await readdir(existing), ["keep.txt"]);
  assert.equal(await readFile(join(existing, "keep.txt"), "utf8"), "original");
  const link = join(root, "linked");
  await symlink(existing, link, "junction");
  await assert.rejects(stageCliPackage(link), /不允许符号链接或 junction/);
  assert.deepEqual(await readdir(existing), ["keep.txt"]);
});

test("打包脚本缺少 npm 调用上下文时明确拒绝，不尝试 shell 或其他包管理器", () => {
  const script = fileURLToPath(new URL("../../../scripts/pack-cli.mjs", import.meta.url));
  const result = spawnSync(process.execPath, [script], {
    env: { ...process.env, npm_execpath: "" },
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /请在生成器仓库运行 npm run cli:pack/);
});
