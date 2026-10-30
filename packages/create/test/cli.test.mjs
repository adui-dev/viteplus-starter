import assert from "node:assert/strict";
import test from "node:test";
import { spawnSync } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseCliArgs } from "../src/cli-args.mjs";
import { collectProjectOptions } from "../src/prompts.mjs";

test("解析框架参数与 Dry Run", () => {
  assert.deepEqual(
    parseCliArgs(["--name", "hello", "--type", "application", "--framework", "vue", "--dry-run"]),
    {
      name: "hello",
      type: "application",
      framework: "vue",
      language: undefined,
      ui: undefined,
      css: undefined,
      dryRun: true,
      applyExisting: false,
      repairExisting: false,
      uiSmoke: false,
    },
  );
});

test("拒绝未知、重复和缺少值的参数", () => {
  assert.throws(() => parseCliArgs(["--bogus"]));
  assert.throws(() => parseCliArgs(["--name"]));
  assert.throws(() => parseCliArgs(["--name", "one", "--name", "two"]));
});

test("交互选择 Vue Application 并确认", async () => {
  const answers = ["my-app", "1", "1", "1", "1", "1", "1", "y"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.deepEqual(result, {
    name: "my-app",
    type: "application",
    framework: "vue",
    language: "ts",
    ui: "none",
    css: "none",
  });
});

test("交互选择 Monorepo，不询问根框架", async () => {
  const answers = ["my-workspace", "2", "yes"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.deepEqual(result, { name: "my-workspace", type: "monorepo" });
});

test("输入非法名称后重新输入", async () => {
  const messages = [];
  const answers = ["../bad", "valid-app", "application", "react", "1", "1", "1", "1", ""];
  const result = await collectProjectOptions(
    {},
    async () => answers.shift(),
    (s) => messages.push(s),
  );
  assert.equal(result.name, "valid-app");
  assert.equal(result.framework, "react");
  assert.equal(messages.length, 1);
});

test("交互拒绝 Windows 保留名称后重新询问，普通名称仍可确认", async () => {
  const messages = [];
  const answers = ["con", "com1", "con-app", "2", "y"];
  const result = await collectProjectOptions(
    {},
    async () => {
      assert.ok(answers.length, "不应多询问");
      return answers.shift();
    },
    (message) => messages.push(message),
  );
  assert.deepEqual(result, { name: "con-app", type: "monorepo" });
  assert.equal(messages.length, 2);
  assert.ok(messages.every((message) => message.includes("Windows 保留名称")));
});

test("真实 CLI 在创建、预览和维护模式提前拒绝保留名且不写目标", async (t) => {
  const cwd = await mkdtemp(join(tmpdir(), "vp-reserved-name-"));
  t.after(() => rm(cwd, { recursive: true, force: true }));
  const cli = fileURLToPath(new URL("../bin/cli.mjs", import.meta.url));
  // Even if validation regresses, tests must not invoke an installed generator.
  const env = Object.fromEntries(
    Object.entries(process.env).filter(([key]) => key.toUpperCase() !== "PATH"),
  );
  env.PATH = "";
  for (const args of [
    ["--name", "con", "--type", "application", "--framework", "vue"],
    ["--name", "nul", "--type", "application", "--framework", "react", "--dry-run"],
    ["--name", "prn", "--type", "monorepo"],
    ["--name", "lpt9", "--type", "monorepo", "--dry-run"],
    [
      "--name",
      "com1",
      "--type",
      "application",
      "--framework",
      "vue",
      "--workspace",
      join(cwd, "missing-workspace"),
    ],
    ["--name", "aux", "--type", "application", "--framework", "react", "--apply-existing"],
    [
      "--name",
      "nul",
      "--type",
      "application",
      "--framework",
      "vue",
      "--ui",
      "element-plus",
      "--ui-smoke",
    ],
  ]) {
    const result = spawnSync(process.execPath, [cli, ...args], {
      cwd,
      env,
      encoding: "utf8",
      timeout: 10_000,
    });
    assert.equal(result.status, 1, result.stderr);
    assert.match(result.stderr, /不能使用 Windows 保留名称/);
    assert.equal(result.stdout, "");
    assert.deepEqual(await readdir(cwd), []);
  }
  const valid = spawnSync(
    process.execPath,
    [cli, "--name", "con-app", "--type", "application", "--framework", "vue", "--dry-run"],
    { cwd, env, encoding: "utf8", timeout: 10_000 },
  );
  assert.equal(valid.status, 0, valid.stderr);
  assert.equal(JSON.parse(valid.stdout).args[3], "con-app");
  assert.deepEqual(await readdir(cwd), []);
});

test("取消交互不会生成项目参数", async () => {
  const answers = ["my-app", "1", "2", "1", "1", "1", "1", "n"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.equal(result, null);
});

test("非交互完整配置不需要二次确认", async () => {
  const result = await collectProjectOptions(
    { name: "my-app", type: "application", framework: "react" },
    async () => {
      throw new Error("不应询问");
    },
  );
  assert.deepEqual(result, { name: "my-app", type: "application", framework: "react" });
});

test("交互选择 Vue + TDesign + UnoCSS", async () => {
  const answers = ["my-vue", "1", "1", "1", "4", "2", "1", "y"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.equal(result.ui, "tdesign");
  assert.equal(result.css, "unocss");
});

test("React 的 UI 菜单不提供 Element Plus", async () => {
  const answers = ["my-react", "1", "2", "1", "2", "3", "1", "y"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.equal(result.ui, "antd");
  assert.equal(result.css, "tailwindcss");
});

test("显式补装参数及重复补装标记校验", () => {
  const parsed = parseCliArgs([
    "--name",
    "demo",
    "--type",
    "application",
    "--framework",
    "vue",
    "--ui",
    "tdesign",
    "--apply-existing",
  ]);
  assert.equal(parsed.applyExisting, true);
  assert.throws(() => parseCliArgs(["--apply-existing", "--apply-existing"]));
});

test("旧版修复参数可解析，不允许重复", () => {
  const result = parseCliArgs([
    "--name",
    "demo",
    "--type",
    "application",
    "--framework",
    "vue",
    "--repair-existing",
  ]);
  assert.equal(result.repairExisting, true);
  assert.throws(() => parseCliArgs(["--repair-existing", "--repair-existing"]));
});

test("解析显式 JavaScript 语言参数", () => {
  const parsed = parseCliArgs([
    "--name",
    "demo-js",
    "--type",
    "application",
    "--framework",
    "vue",
    "--language",
    "js",
  ]);
  assert.equal(parsed.language, "js");
  assert.throws(() => parseCliArgs(["--language", "js", "--language", "ts"]));
  assert.throws(() => parseCliArgs(["--language"]));
});

test("交互式选择 Vue JavaScript", async () => {
  const answers = ["vue-js-demo", "1", "1", "2", "1", "1", "1", "y"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.equal(result.framework, "vue");
  assert.equal(result.language, "js");
  assert.equal(result.ui, "none");
});

test("交互式选择 React JavaScript 并启用 Ant Design / Tailwind", async () => {
  const answers = ["react-js-demo", "1", "2", "2", "2", "3", "1", "y"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.deepEqual(
    [result.framework, result.language, result.ui, result.css],
    ["react", "js", "antd", "tailwindcss"],
  );
});

test("交互空输入默认 TypeScript", async () => {
  const answers = ["default-ts-demo", "1", "1", "", "1", "1", "1", "yes"];
  const result = await collectProjectOptions({}, async () => answers.shift());
  assert.equal(result.language, "ts");
});

test("独立 UI Smoke 验证页参数可解析，重复参数拒绝", () => {
  const parsed = parseCliArgs([
    "--name",
    "starter-vue-js",
    "--type",
    "application",
    "--framework",
    "vue",
    "--language",
    "js",
    "--ui",
    "tdesign",
    "--css",
    "unocss",
    "--ui-smoke",
  ]);
  assert.equal(parsed.uiSmoke, true);
  assert.throws(() => parseCliArgs(["--ui-smoke", "--ui-smoke"]));
});
