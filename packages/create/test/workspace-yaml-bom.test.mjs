import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, readdir, lstat, rm } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { validateWorkspacePackages, planWorkspacePeerExtensions } from "../src/workspace.mjs";
import {
  denyCoreJsBuild,
  preflightUiBuildPolicy,
  prepareUiBuildPolicy,
} from "../src/build-policy.mjs";
import { resolveWorkspaceApplication, prepareWorkspacePeerExtensions } from "../src/workspace.mjs";
import { executeWorkspaceRecovery } from "../src/workspace-recovery-execute.mjs";

const options = { framework: "vue", ui: "antd", css: "unocss" };
const packages = "packages:\n  - apps/*\n  - packages/*\n";
const peers =
  "packageExtensions:\n  'unplugin-vue-components@*':\n    peerDependencies:\n      vite: '*'\n  'unocss@*':\n    peerDependencies:\n      vite: '*'\n";

test("BOM YAML 正常识别 packages 与已有 peer，重复规划不新增块", () => {
  validateWorkspacePackages("\uFEFF" + packages);
  validateWorkspacePackages("\uFEFF" + packages.replaceAll("\n", "\r\n"));
  const source = "\uFEFF" + peers + packages + "# keep\ncatalog:\n  example: 1\n";
  assert.equal(planWorkspacePeerExtensions(source, options), source);
  assert.equal(
    planWorkspacePeerExtensions(source.replaceAll("\n", "\r\n"), options),
    source.replaceAll("\n", "\r\n"),
  );
  const added = planWorkspacePeerExtensions("\uFEFF" + packages, options);
  assert.ok(added.startsWith("\uFEFF" + packages));
  assert.equal((added.match(/^packageExtensions:/gm) ?? []).length, 1);
  assert.equal(planWorkspacePeerExtensions(added, options), added);
});

test("BOM allowBuilds 保留既有明确规则，追加不重复且不放宽冲突保护", () => {
  for (const flag of [true, false]) {
    const source = `\uFEFFallowBuilds:\n  core-js: ${flag}\n  other: true\n` + packages;
    assert.equal(denyCoreJsBuild(source), source);
    assert.equal(denyCoreJsBuild(source.replaceAll("\n", "\r\n")), source.replaceAll("\n", "\r\n"));
  }
  const source = "\uFEFFallowBuilds:\n  other: false\n" + packages;
  const next = denyCoreJsBuild(source);
  assert.ok(next.startsWith("\uFEFFallowBuilds:\n  other: false\n"));
  assert.equal((next.match(/(?:^|\uFEFF)allowBuilds:/gm) ?? []).length, 1);
  assert.match(next, /core-js: false/);
  assert.equal(denyCoreJsBuild(next), next);
  for (const prefix of ["---\n", "<<: *defaults\n"]) {
    assert.throws(() => validateWorkspacePackages("\uFEFF" + prefix + packages), /合并键|多.*文档/);
    assert.throws(() => denyCoreJsBuild("\uFEFF" + prefix + packages), /合并键|多文档/);
  }
  assert.throws(
    () =>
      planWorkspacePeerExtensions(
        "\uFEFF" + peers.replaceAll("vite: '*'", "vite: '^7'") + packages,
        options,
      ),
    /先确认 vite peer/,
  );
  assert.throws(() => denyCoreJsBuild("\uFEFFallowBuilds: {}\n" + packages), /块映射/);
});

test("BOM YAML 检查/规划/跳过恢复只读，显式合并保留 BOM 且拒绝冲突", async (t) => {
  const base = await mkdtemp(join(tmpdir(), "starter-yaml-bom-"));
  assert.equal(dirname(resolve(base)), resolve(tmpdir()));
  assert.ok(basename(base).startsWith("starter-yaml-bom-"));
  t.after(() => rm(base, { recursive: true, force: true }));
  const root = join(base, "repo"),
    app = join(root, "apps", "existing");
  await mkdir(join(app, "src"), { recursive: true });
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ name: "repo", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(root, "vite.config.ts"), "export default defineConfig({fmt:{}})");
  const yaml = join(root, "pnpm-workspace.yaml");
  await writeFile(yaml, "\uFEFF" + packages + "# keep\ncatalog:\n  example: 1\n");
  await writeFile(
    join(app, "package.json"),
    JSON.stringify({ name: "existing", dependencies: { react: "1", "vite-plus": "1" } }),
  );
  for (const path of ["index.html", "vite.config.js", "src/main.jsx"])
    await writeFile(join(app, path), "original");
  const config = join(base, "expected.json");
  const expected = {
    version: 1,
    name: "repo",
    apps: [{ name: "existing", framework: "react", language: "js" }],
  };
  await writeFile(config, JSON.stringify(expected));
  const snapshot = async () =>
    Promise.all(
      (await readdir(base, { recursive: true })).sort().map(async (path) => {
        const info = await lstat(join(base, path));
        return {
          path,
          mtime: info.mtimeMs,
          content: info.isFile() ? await readFile(join(base, path)) : null,
        };
      }),
    );
  const before = await snapshot();
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  const env = {
    ...Object.fromEntries(
      Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
    ),
    PATH: "",
  };
  const run = (args) =>
    spawnSync(process.execPath, [cli, ...args], {
      cwd: base,
      env,
      encoding: "utf8",
      timeout: 10000,
    });
  for (const mode of ["--inspect-workspace", "--plan-recovery", "--execute-recovery"]) {
    const output = run([mode, root, "--config", config]);
    assert.equal(output.status, 0, output.stderr);
    const data = JSON.parse(output.stdout);
    if (mode === "--execute-recovery") assert.deepEqual(data.skipped, ["existing"]);
    else assert.equal(data.ok, true);
  }
  const preview = run([
    "--workspace",
    root,
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
    "--dry-run",
  ]);
  assert.equal(preview.status, 0, preview.stderr);
  assert.deepEqual(await snapshot(), before);
  await writeFile(
    config,
    JSON.stringify({
      ...expected,
      apps: [...expected.apps, { name: "fresh", framework: "vue", ui: "antd", css: "unocss" }],
    }),
  );
  const missing = run(["--plan-recovery", root, "--config", config]);
  assert.equal(missing.status, 0, missing.stderr);
  assert.equal(JSON.parse(missing.stdout).apps[1].action, "create-missing");
  const calls = [];
  await assert.rejects(
    executeWorkspaceRecovery(
      root,
      config,
      (step) => {
        calls.push(step.label);
        throw Object.assign(new Error("controlled failure"), { exitCode: 17 });
      },
      () => {},
    ),
    (error) => error.exitCode === 17,
  );
  assert.deepEqual(calls, ["新建应用 fresh"]);
  const context = await resolveWorkspaceApplication({
    ...options,
    name: "fresh",
    type: "application",
    workspace: root,
  });
  assert.equal(await prepareWorkspacePeerExtensions(context), true);
  const policy = await preflightUiBuildPolicy(app, options);
  assert.ok(policy.next.startsWith("\uFEFF"));
  assert.equal(await prepareUiBuildPolicy(app, options), yaml);
  const updated = await readFile(yaml, "utf8");
  assert.ok(updated.startsWith("\uFEFF" + packages));
  assert.match(updated, /# keep\ncatalog:\n  example: 1/);
  assert.equal((updated.match(/^packageExtensions:/gm) ?? []).length, 1);
  assert.equal((updated.match(/^allowBuilds:/gm) ?? []).length, 1);
  assert.equal(await prepareUiBuildPolicy(app, options), null);
  assert.equal(
    await prepareWorkspacePeerExtensions(
      await resolveWorkspaceApplication({
        ...options,
        name: "fresh",
        type: "application",
        workspace: root,
      }),
    ),
    false,
  );
  const protectedFiles = before.filter(
    (item) =>
      item.content !== null &&
      !item.path.endsWith("pnpm-workspace.yaml") &&
      !item.path.endsWith("expected.json"),
  );
  assert.deepEqual(
    (await snapshot()).filter((item) =>
      protectedFiles.some((original) => original.path === item.path),
    ),
    protectedFiles,
  );
  await writeFile(yaml, "\uFEFFallowBuilds: {}\n" + packages);
  const conflict = await snapshot();
  await assert.rejects(preflightUiBuildPolicy(app, options), /块映射/);
  assert.deepEqual(await snapshot(), conflict);
});
