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
