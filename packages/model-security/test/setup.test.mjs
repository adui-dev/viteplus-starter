import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { setupModelPlugin } from "../src/setup.mjs";
test("安装器增量配置、保留原件、拒绝重复与覆盖或链接", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "adui-setup-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ dependencies: { "vite-plus": "1.4.0", vue: "3" } }),
  );
  const original =
    'import {defineConfig} from "vite-plus";export default defineConfig({server:{port:4321}})';
  await writeFile(join(root, "vite.config.ts"), original);
  await mkdir(join(root, "src/adui-three"), { recursive: true });
  await writeFile(join(root, "src/main.ts"), "original entry");
  await writeFile(join(root, "src/adui-three/lazy.mjs"), "export const loadBundledModel = true");
  await setupModelPlugin(root, "embedded");
  const source = await readFile(join(root, "vite.config.ts"), "utf8");
  assert.match(source, /aduiModels/);
  assert.match(source, /4321/);
  assert.equal(await readFile(join(root, "vite.config.ts.before-adui-models"), "utf8"), original);
  assert.ok(
    !(await readFile(join(root, "adui-model-build/vite.mjs"), "utf8")).includes("../../three/src"),
  );
  await assert.rejects(setupModelPlugin(root, "embedded"), /重复/);
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), source);
  await writeFile(join(root, "vite.config.ts"), original);
  await assert.rejects(setupModelPlugin(root), /覆盖/);
  await writeFile(
    join(root, "package.json"),
    await readFile(join(root, "package.json.before-adui-models"), "utf8"),
  );
  await rm(join(root, "adui-model-build"), { recursive: true });
  await rm(join(root, "src"), { recursive: true });
  await rm(join(root, "vite.config.ts.before-adui-models"));
  await rm(join(root, "model-smoke.html"));
  await rm(join(root, "package.json.before-adui-models"));
  const outside = await mkdtemp(join(tmpdir(), "adui-setup-out-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await mkdir(join(root, "src/adui-three"), { recursive: true });
  await writeFile(join(root, "src/adui-three/lazy.mjs"), "export const loadBundledModel = true");
  await symlink(outside, join(root, "adui-model-build"), "junction");
  await assert.rejects(setupModelPlugin(root), /链接/);
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), original);
});
