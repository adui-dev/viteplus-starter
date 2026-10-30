import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, lstat, rm, symlink } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import { inspectWorkspace } from "../src/workspace-inspect.mjs";
import { resolveWorkspaceApplication } from "../src/workspace.mjs";
import { planWorkspaceRecovery } from "../src/workspace-recovery.mjs";
import { executeWorkspaceRecovery } from "../src/workspace-recovery-execute.mjs";

const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
const env = {
  ...Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  ),
  PATH: "",
};
async function app(root, name, framework, language) {
  const directory = join(root, "apps", name);
  await mkdir(join(directory, "src"), { recursive: true });
  await writeFile(
    join(directory, "package.json"),
    JSON.stringify({
      name: "@review/" + name,
      dependencies: { [framework]: "1", "vite-plus": "1" },
    }),
  );
  const ext = framework === "vue" ? language : language === "js" ? "jsx" : "tsx";
  for (const file of ["index.html", "vite.config.js", "src/main." + ext])
    await writeFile(join(directory, file), "original");
}
async function fixture(t) {
  const base = await mkdtemp(join(tmpdir(), "starter-workspace-json-"));
  assert.equal(dirname(resolve(base)), resolve(tmpdir()));
  assert.ok(basename(base).startsWith("starter-workspace-json-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "repo");
  await mkdir(join(root, "packages", "utils"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "@review/root", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(root, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n  - packages/*\n");
  await writeFile(join(root, "vite.config.ts"), "export default defineConfig({})");
  await writeFile(
    join(root, "packages/utils/package.json"),
    JSON.stringify({ name: "@review/utils" }),
  );
  await app(root, "existing", "react", "js");
  const config = join(base, "expected.json");
  await writeFile(
    config,
    JSON.stringify({
      version: 1,
      name: "repo",
      apps: [
        { name: "existing", framework: "react", language: "js" },
        { name: "fresh", framework: "vue" },
      ],
    }),
  );
  return { base, root, config };
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
const options = (root) => ({
  name: "fresh",
  type: "application",
  framework: "vue",
  workspace: root,
});
const run = (f, args) =>
  spawnSync(process.execPath, [cli, ...args], {
    cwd: f.base,
    env,
    encoding: "utf8",
    timeout: 10000,
  });

test("BOM 清单只读可查，根转为无 BOM 后成员清单仍参与规划和恢复", async (t) => {
  const f = await fixture(t);
  for (const file of [
    "package.json",
    "apps/existing/package.json",
    "packages/utils/package.json",
  ]) {
    const path = join(f.root, file);
    const source = Buffer.from("\uFEFF" + (await readFile(path, "utf8")));
    await writeFile(
      path,
      file === "package.json"
        ? Buffer.concat([source, Buffer.alloc(1024 * 1024 - source.length, " ")])
        : source,
    );
  }
  const initial = await snapshot(f.base);
  const inspection = await inspectWorkspace(f.root, f.config);
  assert.deepEqual(
    inspection.apps.map((a) => a.status),
    ["present", "not-created"],
  );
  assert.equal(
    (
      await resolveWorkspaceApplication({
        ...options(f.root),
        name: "existing",
        framework: "react",
        language: "js",
      })
    ).exists,
    true,
  );
  assert.deepEqual(await snapshot(f.base), initial);
  const rootManifest = join(f.root, "package.json");
  await writeFile(rootManifest, (await readFile(rootManifest, "utf8")).slice(1));
  const before = await snapshot(f.base);
  const plan = await planWorkspaceRecovery(f.root, f.config);
  assert.equal(plan.ok, true, JSON.stringify(plan.apps));
  assert.deepEqual(
    plan.apps.map((a) => a.action),
    ["validate-existing", "create-missing"],
  );
  assert.equal((await resolveWorkspaceApplication(options(f.root))).exists, false);
  assert.deepEqual(await snapshot(f.base), before);
  const calls = [];
  const result = await executeWorkspaceRecovery(
    f.root,
    f.config,
    async (step) => {
      calls.push(step.label);
      await app(f.root, "fresh", "vue", "ts");
    },
    () => {},
  );
  assert.deepEqual(calls, ["新建应用 fresh"]);
  assert.deepEqual(result.skipped, ["existing"]);
  const originalFiles = before.filter((item) => item.content !== null);
  assert.deepEqual(
    (await snapshot(f.base)).filter((item) => originalFiles.some((old) => old.path === item.path)),
    originalFiles,
  );
  const afterCreation = await snapshot(f.base);
  for (const mode of ["--inspect-workspace", "--plan-recovery", "--execute-recovery"]) {
    const output = run(f, [mode, f.root, "--config", f.config]);
    assert.equal(output.status, 0, output.stderr);
    const data = JSON.parse(output.stdout);
    if (mode === "--execute-recovery") {
      assert.deepEqual(data.completed, []);
      assert.deepEqual(data.skipped, ["existing", "fresh"]);
    } else assert.equal(data.ok, true);
  }
  const preview = run(f, [
    "--workspace",
    f.root,
    "--name",
    "next-app",
    "--type",
    "application",
    "--framework",
    "react",
    "--dry-run",
  ]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(await snapshot(f.base), afterCreation);
});

test("官方模板不支持根 BOM 时提前阻塞新建，不写 peer 或自动转换清单", async (t) => {
  const f = await fixture(t);
  const manifest = join(f.root, "package.json");
  await writeFile(manifest, "\uFEFF" + (await readFile(manifest, "utf8")));
  const before = await snapshot(f.base);
  const plan = await planWorkspaceRecovery(f.root, f.config);
  assert.equal(plan.ok, false);
  assert.deepEqual(
    plan.apps.map((app) => app.action),
    ["validate-existing", "manual-review"],
  );
  assert.ok(
    plan.apps[1].reasons.some((reason) => reason.includes("官方模板") && reason.includes(manifest)),
  );
  await assert.rejects(
    executeWorkspaceRecovery(f.root, f.config, () => assert.fail("不得启动子进程")),
    /人工阻塞/,
  );
  const create = run(f, [
    "--workspace",
    f.root,
    "--name",
    "fresh",
    "--type",
    "application",
    "--framework",
    "vue",
    "--ui",
    "antd",
    "--css",
    "unocss",
  ]);
  assert.equal(create.status, 1);
  assert.ok(create.stderr.includes(manifest));
  assert.match(create.stderr, /官方模板.*BOM/);
  for (const mode of ["--plan-recovery", "--execute-recovery"]) {
    const output = run(f, [mode, f.root, "--config", f.config]);
    assert.equal(output.status, 1, output.stderr);
  }
  await writeFile(
    f.config,
    JSON.stringify({
      version: 1,
      name: "repo",
      apps: [{ name: "existing", framework: "react", language: "js" }],
    }),
  );
  const skipped = run(f, ["--execute-recovery", f.root, "--config", f.config]);
  assert.equal(skipped.status, 0, skipped.stderr);
  assert.deepEqual(JSON.parse(skipped.stdout).skipped, ["existing"]);
  const originalFiles = before.filter((item) => !item.path.endsWith("expected.json"));
  assert.deepEqual(
    (await snapshot(f.base)).filter((item) => !item.path.endsWith("expected.json")),
    originalFiles,
  );
});

test("BOM 成员仍参与作用域重名检测，不通过 BOM 绕过冲突", async (t) => {
  const f = await fixture(t);
  await writeFile(
    join(f.root, "packages/utils/package.json"),
    "\uFEFF" + JSON.stringify({ name: "@review/fresh" }),
  );
  const before = await snapshot(f.base);
  await assert.rejects(resolveWorkspaceApplication(options(f.root)), /同名包/);
  const plan = await planWorkspaceRecovery(f.root, f.config);
  assert.equal(plan.ok, false);
  assert.equal(plan.apps[1].action, "manual-review");
  assert.ok(plan.apps[1].reasons.some((reason) => reason.includes("同名包")));
  assert.deepEqual(await snapshot(f.base), before);
});

test("根及成员坏清单在预检拒绝，报错包含路径但不回显原文", async (t) => {
  for (const member of [false, true])
    for (const mode of ["json", "null", "array", "directory", "link", "oversized"]) {
      const f = await fixture(t);
      const path = join(f.root, member ? "packages/utils/package.json" : "package.json");
      if (mode === "json") await writeFile(path, "CONTENTMARKER-invalid-json");
      if (mode === "null" || mode === "array")
        await writeFile(path, mode === "null" ? "null" : "[]");
      if (mode === "directory" || mode === "link") {
        await rm(path);
        if (mode === "directory") await mkdir(path);
        else {
          const outside = join(f.base, "outside.json");
          await writeFile(outside, "CONTENTMARKER-outside");
          await symlink(outside, path);
        }
      }
      if (mode === "oversized") {
        const original = await readFile(path);
        await writeFile(
          path,
          Buffer.concat([original, Buffer.alloc(1024 * 1024 + 1 - original.length, " ")]),
        );
      }
      const before = await snapshot(f.base);
      const output = run(f, [
        "--workspace",
        f.root,
        "--name",
        "fresh",
        "--type",
        "application",
        "--framework",
        "vue",
        "--dry-run",
      ]);
      assert.equal(output.status, 1, mode);
      assert.ok(output.stderr.includes(path), output.stderr);
      assert.doesNotMatch(output.stderr, /CONTENTMAR/);
      await assert.rejects(resolveWorkspaceApplication(options(f.root)), (error) => {
        assert.ok(error.message.includes(path));
        assert.doesNotMatch(error.message, /CONTENTMAR/);
        return true;
      });
      assert.deepEqual(await snapshot(f.base), before);
    }
});
