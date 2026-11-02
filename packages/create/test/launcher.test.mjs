import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, copyFile, writeFile, readdir, rm } from "node:fs/promises";
import { join, dirname, basename, resolve } from "node:path";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";

async function fixture(t, source) {
  const parent = await mkdtemp(join(tmpdir(), "starter-launcher-"));
  assert.equal(dirname(resolve(parent)), resolve(tmpdir()));
  assert.ok(basename(parent).startsWith("starter-launcher-"));
  t.after(() => rm(parent, { recursive: true, force: true }));
  const repository = join(parent, "下载 工具 & 'starter");
  await mkdir(join(repository, "scripts"), { recursive: true });
  await mkdir(join(repository, "packages/create/bin"), { recursive: true });
  const script = join(repository, "scripts/create.mjs");
  await copyFile(fileURLToPath(new URL("../../../scripts/create.mjs", import.meta.url)), script);
  await writeFile(join(repository, "packages/create/bin/cli.mjs"), source);
  const elsewhere = join(parent, "elsewhere");
  await mkdir(elsewhere);
  return { parent, script, elsewhere };
}

test("下载目录无关的入口在仓库父目录运行，逐项转发参数且不经 shell", async (t) => {
  const f = await fixture(
    t,
    "console.log(JSON.stringify({cwd:process.cwd(),args:process.argv.slice(2)}))",
  );
  const args = [
    "--config",
    "批量 & 'config.json",
    "--workspace",
    "relative path",
    "$value;`data",
    "--dry-run",
  ];
  const before = await readdir(f.parent);
  const result = spawnSync(process.execPath, [f.script, ...args], {
    cwd: f.elsewhere,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { cwd: f.parent, args });
  assert.deepEqual(await readdir(f.parent), before);
});

test("下载入口保留子进程失败退出码，不重试或输出成功", async (t) => {
  const f = await fixture(t, "console.error('controlled failure');process.exit(7)");
  const result = spawnSync(process.execPath, [f.script, "--help"], {
    cwd: f.elsewhere,
    encoding: "utf8",
    timeout: 10000,
  });
  assert.equal(result.status, 7);
  assert.equal(result.stdout, "");
  assert.equal(result.stderr.trim(), "controlled failure");
});

test("真实 CLI 预览显示直接入口和下载入口各自的绝对执行目录与目标，且不写入", async (t) => {
  const cliUrl = new URL("../bin/cli.mjs", import.meta.url);
  const f = await fixture(t, `await import(${JSON.stringify(cliUrl.href)})`);
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  const workspace = join(f.parent, "工作区 & 'existing");
  await mkdir(join(workspace, "apps"), { recursive: true });
  await writeFile(
    join(workspace, "package.json"),
    JSON.stringify({ name: "existing", private: true, devDependencies: { "vite-plus": "1" } }),
  );
  await writeFile(join(workspace, "pnpm-workspace.yaml"), "packages:\n  - apps/*\n");
  await writeFile(
    join(workspace, "vite.config.ts"),
    'import {defineConfig} from "vite-plus";export default defineConfig({})',
  );
  const before = await readdir(f.parent);
  const multiArgs = [
    "--type",
    "application",
    "--framework",
    "react",
    "--language",
    "js",
    "--screen",
    "--engines",
    "three,babylon",
    "--model-protection",
    "none",
  ];
  const cases = [
    ["preview-vue", ["--type", "application", "--framework", "vue", "--language", "js"]],
    ["preview-react", ["--type", "application", "--framework", "react"]],
    ["preview-workspace", ["--type", "monorepo"]],
    ["preview-multi", multiArgs],
    ["preview-member", [...multiArgs, "--workspace", workspace], workspace],
  ];
  for (const [entry, expectedCwd] of [
    [fileURLToPath(cliUrl), f.elsewhere],
    [f.script, f.parent],
  ]) {
    for (const [name, args, workspaceRoot] of cases) {
      const result = spawnSync(process.execPath, [entry, "--name", name, ...args, "--dry-run"], {
        cwd: f.elsewhere,
        env,
        encoding: "utf8",
        timeout: 10000,
      });
      assert.equal(result.status, 0, result.stderr);
      const plan = JSON.parse(result.stdout);
      assert.equal(plan.cwd, workspaceRoot ?? expectedCwd);
      assert.equal(
        plan.target,
        workspaceRoot ? join(workspaceRoot, "apps", name) : join(expectedCwd, name),
      );
      const official = plan.official ?? plan;
      assert.equal(official.command, "vp");
      assert.equal(
        official.args[1],
        name === "preview-workspace" ? "vite:monorepo" : "vite:application",
      );
    }
  }
  assert.deepEqual(await readdir(f.parent), before);
  assert.deepEqual(await readdir(f.elsewhere), []);
  assert.deepEqual(await readdir(join(workspace, "apps")), []);
});
