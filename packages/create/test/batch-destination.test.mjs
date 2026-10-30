import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, rm, symlink } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { createBatchPlan, executeBatch } from "../src/batch.mjs";

const config = { version: 1, name: "review-workspace", apps: [{ name: "web", framework: "vue" }] };
const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  ),
  PATH: "",
};
async function fixture(t) {
  const root = await mkdtemp(join(tmpdir(), "starter-batch-parent-"));
  assert.equal(dirname(resolve(root)), resolve(tmpdir()));
  assert.ok(basename(root).startsWith("starter-batch-parent-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const cwd = join(root, "父目录 中文 & 空格");
  await mkdir(cwd);
  const filename = join(cwd, "批量 配置.json");
  await writeFile(filename, JSON.stringify(config));
  return { root, cwd, filename, manifest: join(root, "package.json") };
}
async function snapshot(root) {
  return Promise.all(
    (await readdir(root, { recursive: true })).sort().map(async (path) => {
      const info = await lstat(join(root, path));
      return {
        path,
        mtime: info.mtimeMs,
        content: info.isFile() ? await readFile(join(root, path)) : null,
      };
    }),
  );
}
function run(f, preview) {
  return spawnSync(
    process.execPath,
    [cli, "--config", f.filename, ...(preview ? ["--dry-run"] : [])],
    { cwd: f.cwd, env, encoding: "utf8", timeout: 10000 },
  );
}

test("批量目标祖先的普通 BOM 清单允许预览，BOM workspace 清单仍拒绝嵌套", async (t) => {
  const f = await fixture(t);
  const source = Buffer.from("\uFEFF" + JSON.stringify({ name: "parent" }));
  await writeFile(
    f.manifest,
    Buffer.concat([source, Buffer.alloc(1024 * 1024 - source.length, " ")]),
  );
  await writeFile(join(f.cwd, "package.json"), "\uFEFF" + JSON.stringify({ name: "child" }));
  let before = await snapshot(f.root);
  const plan = await createBatchPlan(config, f.cwd);
  assert.equal(plan.steps[0].args[1], "vite:monorepo");
  const preview = run(f, true);
  assert.equal(preview.status, 0, preview.stderr);
  assert.equal(JSON.parse(preview.stdout).config.name, config.name);
  assert.deepEqual(await snapshot(f.root), before);
  await writeFile(f.manifest, "\uFEFF" + JSON.stringify({ workspaces: ["apps/*"] }));
  before = await snapshot(f.root);
  const rejected = run(f, false);
  assert.equal(rejected.status, 1, rejected.stderr);
  assert.match(rejected.stderr, /已有 workspace/);
  assert.ok(rejected.stderr.includes(f.manifest));
  assert.deepEqual(await snapshot(f.root), before);
});

test("批量祖先清单损坏时报告路径且不回显原文", async (t) => {
  for (const mode of [
    "json",
    "null",
    "array",
    "number",
    "string",
    "directory",
    "link",
    "dangling",
    "oversized",
  ]) {
    const f = await fixture(t);
    const sources = {
      json: "CONTENTMARKER-invalid-json",
      null: "null",
      array: "[]",
      number: "1",
      string: '"CONTENTMARKER"',
    };
    if (Object.hasOwn(sources, mode)) await writeFile(f.manifest, sources[mode]);
    if (mode === "directory") await mkdir(f.manifest);
    if (mode === "link" || mode === "dangling") {
      const outside = join(f.root, "outside.json");
      if (mode === "link") await writeFile(outside, "CONTENTMARKER-outside");
      await symlink(outside, f.manifest);
    }
    if (mode === "oversized") await writeFile(f.manifest, " ".repeat(1024 * 1024 + 1));
    const before = await snapshot(f.root);
    for (const preview of [true, false]) {
      const rejected = run(f, preview);
      assert.equal(rejected.status, 1, mode);
      assert.ok(rejected.stderr.includes(f.manifest), mode + ": " + rejected.stderr);
      assert.doesNotMatch(rejected.stderr, /CONTENTMAR/);
      assert.deepEqual(await snapshot(f.root), before, mode);
    }
  }
});

test("批量执行重检预览后的祖先清单变化，拒绝时不调用官方工具", async (t) => {
  for (const source of [
    "CONTENTMARKER-invalid-json",
    "\uFEFF" + JSON.stringify({ workspaces: { packages: ["apps/*"] } }),
  ]) {
    const f = await fixture(t);
    await writeFile(f.manifest, "{}");
    const plan = await createBatchPlan(config, f.cwd);
    await writeFile(f.manifest, source);
    const before = await snapshot(f.root);
    await assert.rejects(
      executeBatch(plan, () => assert.fail("不应调用官方工具")),
      (error) => {
        assert.ok(error.message.includes(f.manifest));
        assert.doesNotMatch(error.message, /CONTENTMAR/);
        return true;
      },
    );
    assert.deepEqual(await snapshot(f.root), before);
  }
});
