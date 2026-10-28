import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { denyCoreJsBuild, prepareUiBuildPolicy } from "../src/build-policy.mjs";
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
