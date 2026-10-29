import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { spawnSync } from "node:child_process";
test("完整选项矩阵保留官方命令、按框架隔离、输出无冲突且无写入", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "generator-matrix-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const script = fileURLToPath(
    new URL("../../../scripts/verify-generator-matrix.mjs", import.meta.url),
  );
  const result = spawnSync(process.execPath, [script], { cwd: root, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    planningCases: 378,
    uiSmokePlans: 108,
    screenPlans: 336,
    threePlans: 126,
    cesiumPlans: 42,
    babylonPlans: 126,
    modelProtectionPlans: 168,
    actualBuilds: 0,
  });
  assert.deepEqual(await readdir(root), []);
});
