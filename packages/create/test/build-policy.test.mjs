import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm, stat, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  denyCoreJsBuild,
  prepareUiBuildPolicy,
  preflightUiBuildPolicy,
} from "../src/build-policy.mjs";

test("构建策略只读预检保留内容与 mtime，显式准备时才增量写入", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-policy-preflight-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "apps/viewer");
  await mkdir(app, { recursive: true });
  const file = join(root, "pnpm-workspace.yaml");
  const source =
    "packages:\n  - apps/*\ncatalog:\n  vite: catalog-value\nallowBuilds:\n  esbuild: true\n";
  await writeFile(file, source);
  const before = (await stat(file)).mtimeMs;
  const options = { framework: "vue", ui: "antd" };
  const plan = await preflightUiBuildPolicy(app, options);
  assert.equal(plan.file, file);
  assert.match(plan.next, /core-js: false/);
  assert.equal(await readFile(file, "utf8"), source);
  assert.equal((await stat(file)).mtimeMs, before);
  assert.equal(await prepareUiBuildPolicy(app, options), file);
  const installed = await readFile(file, "utf8");
  assert.match(installed, /esbuild: true/);
  assert.match(installed, /vite: catalog-value/);
  const after = (await stat(file)).mtimeMs;
  assert.equal(await prepareUiBuildPolicy(app, options), null);
  assert.equal((await stat(file)).mtimeMs, after);
  for (const choice of ["true", "false"]) {
    const chosen = "allowBuilds:\n  core-js: " + choice + "\n";
    await writeFile(file, chosen);
    assert.equal((await preflightUiBuildPolicy(app, options)).next, chosen);
  }
});

test("策略目录及链接拒绝，非 Ant Design Vue 不读取或修改策略", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-policy-path-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const file = join(root, "pnpm-workspace.yaml");
  const options = { framework: "vue", ui: "antd" };
  await mkdir(file);
  await assert.rejects(preflightUiBuildPolicy(root, options), /不是普通文件/);
  await rm(file, { recursive: true });
  const original = join(root, "original.yaml");
  await writeFile(original, "allowBuilds: {}\n");
  await symlink(original, file);
  await assert.rejects(preflightUiBuildPolicy(root, options), /符号链接|junction/);
  assert.equal(await preflightUiBuildPolicy(root, { framework: "react", ui: "antd" }), null);
  assert.equal(await readFile(original, "utf8"), "allowBuilds: {}\n");
});
test("只补充 core-js:false，保留 catalog、其他规则及用户已有选择", () => {
  const original = "catalog:\n  vite: npm:@voidzero-dev/vite-plus-core@1.4.0\n";
  const added = denyCoreJsBuild(original);
  assert.ok(added.startsWith(original));
  assert.match(added, /core-js: false/);
  assert.equal(denyCoreJsBuild(added), added);
  const existing = "allowBuilds:\n  esbuild: true\n\nstrictDepBuilds: true\n";
  const merged = denyCoreJsBuild(existing);
  assert.match(merged, /esbuild: true/);
  assert.match(merged, /strictDepBuilds: true/);
  assert.ok(merged.indexOf("core-js: false") < merged.indexOf("strictDepBuilds"));
  for (const choice of ["true", "false"]) {
    const source = "allowBuilds:\n  core-js: " + choice + "\n";
    assert.equal(denyCoreJsBuild(source), source);
  }
  for (const source of [
    "allowBuilds: {}\n",
    "allowBuilds: *policy\n",
    "allowBuilds:\n  core-js: null\n",
    "allowBuilds:\n  'core-js@3': false\n",
    "<<: *policy\n",
    "allowBuilds:\n  core-js: false\n  core-js: true\n",
    "allowBuilds:\n  core-js: false\n  custom: *policy\n",
  ])
    assert.throws(() => denyCoreJsBuild(source));
});
test("Monorepo 只写根策略，非 Ant Design Vue 不修改", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "ui-policy-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "apps/viewer");
  await mkdir(app, { recursive: true });
  const file = join(root, "pnpm-workspace.yaml");
  await writeFile(file, "packages:\n  - 'apps/*'\n");
  assert.equal(await prepareUiBuildPolicy(app, { framework: "react", ui: "antd" }), null);
  assert.equal(await readFile(file, "utf8"), "packages:\n  - 'apps/*'\n");
  assert.equal(await prepareUiBuildPolicy(app, { framework: "vue", ui: "antd" }), file);
  assert.match(await readFile(file, "utf8"), /core-js: false/);
  await assert.rejects(readFile(join(app, "pnpm-workspace.yaml")), { code: "ENOENT" });
});

test("应用与根策略分别定向格式化，不向 Vite+ 传递 .. 路径", async (t) => {
  const { applyIntegrations } = await import("../src/integrations.mjs");
  const root = await mkdtemp(join(tmpdir(), "ui-policy-format-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const app = join(root, "apps/viewer");
  await mkdir(join(app, "src"), { recursive: true });
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  await writeFile(join(app, "package.json"), "{}");
  await writeFile(join(app, "src/main.ts"), "original entry");
  await writeFile(join(app, "src/App.vue"), "original app");
  await writeFile(join(app, "vite.config.ts"), "export default defineConfig({plugins:[]})");
  const calls = [];
  await applyIntegrations(
    app,
    { type: "application", framework: "vue", ui: "antd", css: "unocss", workspace: root },
    () => {},
    (cwd, targets) => {
      assert.ok(targets.every((path) => !path.split(/[\\/]/).includes("..")));
      calls.push({ cwd, targets });
    },
  );
  assert.equal(calls.length, 2);
  assert.equal(calls[0].cwd, app);
  assert.deepEqual(calls[1], { cwd: root, targets: ["pnpm-workspace.yaml"] });
  assert.ok(!calls[0].targets.includes("pnpm-workspace.yaml"));
  assert.equal(await readFile(join(app, "src/App.vue"), "utf8"), "original app");
  assert.match(await readFile(join(root, "pnpm-workspace.yaml"), "utf8"), /core-js: false/);
});
