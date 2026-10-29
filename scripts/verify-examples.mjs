import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { resolve, join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

export async function verifyExamples() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const cwd = await mkdtemp(join(tmpdir(), "adui-example-plans-"));
  try {
    const files = (await readdir(join(root, "examples")))
      .filter((name) => name.endsWith(".batch.json"))
      .sort();
    assert.ok(files.length > 0, "缺少批量示例");
    let apps = 0;
    for (const name of files) {
      const filename = join(root, "examples", name);
      const source = JSON.parse(await readFile(filename, "utf8"));
      const result = spawnSync(
        process.execPath,
        [join(root, "packages/create/bin/cli.mjs"), "--config", filename, "--dry-run"],
        { cwd, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 },
      );
      if (result.error) throw result.error;
      assert.equal(result.status, 0, name + " dry-run 失败：" + result.stderr);
      const plan = JSON.parse(result.stdout);
      assert.equal(plan.config.apps.length, source.apps.length);
      assert.equal(plan.steps[0].kind, "workspace");
      assert.equal(plan.steps[0].args[1], "vite:monorepo");
      assert.equal(
        plan.steps.filter((step) => step.kind === "application").length,
        source.apps.length,
      );
      apps += source.apps.length;
    }
    assert.deepEqual(await readdir(cwd), [], "dry-run 创建了文件");
    return { examples: files.length, applicationPlans: apps, actualBuilds: 0 };
  } finally {
    await rm(cwd, { recursive: true, force: true });
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    console.log(JSON.stringify(await verifyExamples(), null, 2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
