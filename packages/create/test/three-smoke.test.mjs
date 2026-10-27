import { test } from "node:test";
import assert from "node:assert/strict";
import { symlinkSync } from "node:fs";
import { mkdtemp, mkdir, writeFile, readFile, rm, symlink } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { parseCliArgs } from "../src/cli-args.mjs";
import { planThreeSmoke, addThreeSmoke } from "../src/three-smoke.mjs";

async function fixture(t, framework = "vue", language = "ts") {
  const directory = await mkdtemp(join(tmpdir(), "three-smoke-"));
  t.after(() => rm(directory, { recursive: true, force: true }));
  const options = { name: "demo", type: "application", framework, language };
  await mkdir(join(directory, "src/adui-screen"), { recursive: true });
  const files = {
    "package.json": JSON.stringify({ dependencies: { "vite-plus": "1.4.0", [framework]: "test" } }),
    ["src/" +
    (framework === "vue"
      ? language === "ts"
        ? "main.ts"
        : "main.js"
      : language === "ts"
        ? "main.tsx"
        : "main.jsx")]: "original entry",
    "vite.config.ts": "original config",
  };
  for (const name of [
    "core.mjs",
    "controller.mjs",
    "style.css",
    framework + ".mjs",
    "config." + language,
  ])
    files["src/adui-screen/" + name] = "existing screen";
  for (const [path, content] of Object.entries(files))
    await writeFile(join(directory, path), content);
  return { directory, options, files };
}
test("Three Smoke 四种框架语言计划、独立入口与 CLI 重复参数保护", async () => {
  assert.equal(parseCliArgs(["--three-smoke"]).threeSmoke, true);
  assert.throws(() => parseCliArgs(["--three-smoke", "--three-smoke"]), /重复/);
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const plan = await planThreeSmoke({ name: "demo", type: "application", framework, language });
      assert.ok(plan.files["three-smoke.html"]);
      assert.ok(plan.files["src/adui-three/index.mjs"]);
      assert.equal(
        Object.keys(plan.files).some((path) => path.startsWith("src/adui-screen")),
        false,
      );
      assert.equal(
        Object.keys(plan.files).some((path) => path === "vite.config.ts" || path === "src/main.ts"),
        false,
      );
    }
  await assert.rejects(planThreeSmoke({ name: "demo", type: "monorepo" }), /Application/);
});
test("首次补装固定版本依赖，保留正式入口与大屏文件；重复补装在安装前拒绝", async (t) => {
  const f = await fixture(t),
    calls = [];
  await addThreeSmoke(f.directory, f.options, (...args) => calls.push(args));
  assert.deepEqual(calls[0][1], ["add", "three@0.186.1", "--save-exact"]);
  assert.deepEqual(calls[1][1], ["add", "-D", "@types/three@0.186.0", "--save-exact"]);
  for (const [path, content] of Object.entries(f.files))
    assert.equal(await readFile(join(f.directory, path), "utf8"), content);
  let called = false;
  await assert.rejects(
    addThreeSmoke(f.directory, f.options, () => {
      called = true;
    }),
    /拒绝覆盖/,
  );
  assert.equal(called, false);
});
test("框架语言缺失、已有依赖版本、目录占用与 junction 均在安装前拒绝", async (t) => {
  const f = await fixture(t);
  let calls = 0;
  const runner = () => {
    calls++;
  };
  await assert.rejects(
    addThreeSmoke(f.directory, { ...f.options, language: "js" }, runner),
    /缺少/,
  );
  await writeFile(
    join(f.directory, "package.json"),
    JSON.stringify({ dependencies: { "vite-plus": "1.4.0", vue: "3", three: "0.150.0" } }),
  );
  await assert.rejects(addThreeSmoke(f.directory, f.options, runner), /拒绝自动升级/);
  await writeFile(join(f.directory, "src/adui-three"), "occupied");
  await assert.rejects(addThreeSmoke(f.directory, f.options, runner), /目录被占用/);
  await rm(join(f.directory, "src/adui-three"));
  const outside = await mkdtemp(join(tmpdir(), "three-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(f.directory, "src/adui-three"), "junction");
  await assert.rejects(addThreeSmoke(f.directory, f.options, runner), /junction/);
  assert.equal(calls, 0);
});
test("安装失败不写生成文件；安装期间目录被替换仍拒绝", async (t) => {
  const f = await fixture(t);
  await assert.rejects(
    addThreeSmoke(f.directory, f.options, () => {
      throw new Error("安装失败");
    }),
    /安装失败/,
  );
  await assert.rejects(readFile(join(f.directory, "three-smoke.html")), { code: "ENOENT" });
  const outside = await mkdtemp(join(tmpdir(), "three-race-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  let replaced = false;
  await assert.rejects(
    addThreeSmoke(f.directory, f.options, () => {
      if (!replaced) {
        replaced = true;
        symlinkSync(outside, join(f.directory, "src/adui-three"), "junction");
      }
    }),
    /junction/,
  );
  assert.equal(replaced, true);
  await assert.rejects(readFile(join(outside, "index.mjs")), { code: "ENOENT" });
  await assert.rejects(readFile(join(f.directory, "three-smoke.html")), { code: "ENOENT" });
});
