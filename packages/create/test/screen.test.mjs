import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { addScreenPreset, planScreenPreset } from "../src/screen.mjs";
import { validateProjectOptions } from "../src/options.mjs";
import { parseCliArgs } from "../src/cli-args.mjs";
import { createBatchPlan, validateBatchConfig } from "../src/batch.mjs";

const base = { name: "screen-demo", type: "application", framework: "vue", screen: true };
async function fixture(t, framework = "vue", language = "ts") {
  const root = await mkdtemp(join(tmpdir(), "adui-screen-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src"));
  await writeFile(
    join(root, "package.json"),
    JSON.stringify({ devDependencies: { "vite-plus": "1.4.0", [framework]: "1.0.0" } }),
  );
  const extension =
    framework === "vue" ? (language === "ts" ? "ts" : "js") : language === "ts" ? "tsx" : "jsx";
  await writeFile(join(root, "src/main." + extension), "original entry");
  await writeFile(join(root, "vite.config.ts"), "original config");
  return root;
}
test("CLI/JSON 大屏参数白名单与默认值，拒绝根配置和无效尺寸模式", () => {
  const parsed = parseCliArgs([
    "--name",
    "screen-demo",
    "--type",
    "application",
    "--framework",
    "vue",
    "--screen",
    "--screen-width",
    "1280",
    "--screen-height",
    "720",
    "--screen-mode",
    "cover",
  ]);
  assert.deepEqual(validateProjectOptions(parsed).screen, {
    designWidth: 1280,
    designHeight: 720,
    mode: "cover",
  });
  assert.deepEqual(validateProjectOptions(base).screen, {
    designWidth: 1920,
    designHeight: 1080,
    mode: "contain",
  });
  for (const screen of [
    null,
    "yes",
    { designWidth: 0 },
    { designWidth: "1920" },
    { mode: "fit" },
    { unknown: true },
  ])
    assert.throws(() => validateProjectOptions({ ...base, screen }));
  assert.throws(() => validateProjectOptions({ name: "root", type: "monorepo", screen: true }));
  assert.throws(() =>
    validateProjectOptions({ ...base, screen: undefined, "screen-width": "1000" }),
  );
  assert.throws(() => parseCliArgs(["--screen", "--screen"]));
});
test("四种框架/语言输出同源核心、专属适配器和独立验收页", async () => {
  for (const framework of ["vue", "react"])
    for (const language of ["ts", "js"]) {
      const plan = await planScreenPreset({ ...base, framework, language });
      assert.ok(plan.files["src/adui-screen/" + framework + ".mjs"]);
      assert.equal(
        plan.files["src/adui-screen/" + (framework === "vue" ? "react" : "vue") + ".mjs"],
        undefined,
      );
      assert.match(plan.files["screen-smoke.html"], /screen-root/);
      assert.equal(plan.files["src/main.ts"], undefined);
      assert.equal(plan.files["vite.config.ts"], undefined);
      assert.equal(
        plan.files["src/adui-screen/core.mjs"],
        await readFile(new URL("../../screen/src/core.mjs", import.meta.url), "utf8"),
      );
    }
});
test("已有项目补装不修改正式入口/配置/manifest，重复安装安全拒绝", async (t) => {
  const root = await fixture(t);
  let formats = 0;
  await addScreenPreset(root, base, () => formats++);
  assert.equal(formats, 1);
  assert.equal(await readFile(join(root, "src/main.ts"), "utf8"), "original entry");
  assert.equal(await readFile(join(root, "vite.config.ts"), "utf8"), "original config");
  await assert.rejects(
    addScreenPreset(root, base, () => {}),
    /拒绝覆盖/,
  );
});
test("预存在文件、src junction、语言不符在任何写入前拒绝", async (t) => {
  const root = await fixture(t);
  await mkdir(join(root, "src/adui-screen"));
  await writeFile(join(root, "src/adui-screen/core.mjs"), "keep");
  await assert.rejects(
    addScreenPreset(root, base, () => {}),
    /拒绝覆盖/,
  );
  await assert.rejects(readFile(join(root, "screen-smoke.html")), { code: "ENOENT" });
  assert.equal(await readFile(join(root, "src/adui-screen/core.mjs"), "utf8"), "keep");
  await assert.rejects(
    addScreenPreset(root, { ...base, language: "js" }, () => {}),
    /语言/,
  );
  const linked = await fixture(t);
  const outside = await fixture(t);
  await rm(join(linked, "src"), { recursive: true });
  await symlink(
    join(outside, "src"),
    join(linked, "src"),
    process.platform === "win32" ? "junction" : "dir",
  );
  await assert.rejects(
    addScreenPreset(linked, base, () => {}),
    /junction/,
  );
  await assert.rejects(readFile(join(outside, "src/adui-screen/core.mjs")), { code: "ENOENT" });
});
test("批量 screen 与 uiSmoke 同时选择时，UI 验收阶段不混用 screen 标记", async (t) => {
  const root = await mkdtemp(join(tmpdir(), "screen-batch-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  const input = {
    version: 1,
    name: "screen-batch",
    apps: [
      {
        name: "admin",
        framework: "vue",
        ui: "tdesign",
        screen: { designWidth: 1280, designHeight: 720, mode: "contain" },
        uiSmoke: true,
      },
    ],
  };
  const checked = validateBatchConfig(input);
  assert.equal(checked.apps[0].screen.designWidth, 1280);
  const plan = await createBatchPlan(input, root);
  assert.ok(plan.steps[1].args.includes("--screen"));
  assert.ok(plan.steps[1].screen.files.includes("screen-smoke.html"));
  assert.equal(plan.steps[2].args.includes("--screen"), false);
});
