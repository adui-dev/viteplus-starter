import assert from "node:assert/strict";
import test from "node:test";
import { buildVpCommand, validateProjectName, validateProjectOptions } from "../src/options.mjs";

test("Windows 保留名称在公共入口拒绝，带前后缀的普通名称保留", () => {
  const reserved = [
    "con",
    "prn",
    "aux",
    "nul",
    ...Array.from({ length: 9 }, (_, index) => "com" + (index + 1)),
    ...Array.from({ length: 9 }, (_, index) => "lpt" + (index + 1)),
  ];
  for (const name of reserved) {
    assert.throws(() => validateProjectName(name), /Windows 保留名称/);
    for (const options of [
      { type: "application", framework: "vue" },
      { type: "application", framework: "react", workspace: "./workspace" },
      { type: "monorepo" },
    ])
      assert.throws(() => buildVpCommand({ ...options, name }), /Windows 保留名称/);
  }
  for (const name of [
    "console",
    "auxiliary",
    "null",
    "con-app",
    "my-nul",
    "com1-app",
    "lpt9-tools",
    "com10",
    "lpt10",
  ]) {
    assert.equal(validateProjectName(name), name);
    assert.ok(buildVpCommand({ name, type: "application", framework: "vue" }).args.includes(name));
  }
});

test("Vue Application 使用官方 vite:application 和 vue-ts", () => {
  const result = buildVpCommand({ name: "my-vue-app", type: "application", framework: "vue" });
  assert.equal(result.command, "vp");
  assert.deepEqual(result.args, [
    "create",
    "vite:application",
    "--directory",
    "my-vue-app",
    "--package-manager",
    "pnpm",
    "--git",
    "--",
    "--template",
    "vue-ts",
  ]);
});

test("React Application 使用官方 react-ts 模板", () => {
  const result = buildVpCommand({ name: "my-react-app", type: "application", framework: "react" });
  assert.deepEqual(result.args.slice(-3), ["--", "--template", "react-ts"]);
});

test("Monorepo 仅生成官方工作区，不指定单一框架", () => {
  const result = buildVpCommand({ name: "my-workspace", type: "monorepo" });
  assert.equal(result.args[1], "vite:monorepo");
  assert.equal(result.args.includes("--template"), false);
});

test("拒绝目录遍历、无效项目类型以及缺失/无效框架", () => {
  for (const name of ["../danger", "Bad Name", "a--b", ".hidden", "", "abc&whoami"]) {
    assert.throws(() => validateProjectOptions({ name, type: "application", framework: "vue" }));
  }
  assert.throws(() => validateProjectOptions({ name: "valid", type: "other" }));
  assert.throws(() => validateProjectOptions({ name: "valid", type: "application" }));
  assert.throws(() =>
    validateProjectOptions({ name: "valid", type: "application", framework: "angular" }),
  );
  assert.throws(() =>
    validateProjectOptions({ name: "valid", type: "monorepo", framework: "vue" }),
  );
});

test("UI/CSS 配置的框架兼容性校验", () => {
  assert.throws(() =>
    validateProjectOptions({
      name: "demo",
      type: "application",
      framework: "react",
      ui: "element-plus",
    }),
  );
  assert.throws(() =>
    validateProjectOptions({ name: "demo", type: "monorepo", css: "tailwindcss" }),
  );
  assert.throws(() =>
    validateProjectOptions({ name: "demo", type: "application", framework: "vue", css: "unknown" }),
  );
});

test("Vue / React 两种语言全部使用 Vite+ 官方模板", () => {
  const variants = [
    ["vue", "ts", "vue-ts"],
    ["vue", "js", "vue"],
    ["react", "ts", "react-ts"],
    ["react", "js", "react"],
  ];
  for (const [framework, language, expected] of variants) {
    const result = buildVpCommand({
      name: "language-demo",
      type: "application",
      framework,
      language,
    });
    assert.equal(result.args[1], "vite:application");
    assert.deepEqual(result.args.slice(-3), ["--", "--template", expected]);
  }
});

test("默认语言 TypeScript，拒绝非法语言和 Monorepo 全局语言", () => {
  const defaults = validateProjectOptions({
    name: "default-ts",
    type: "application",
    framework: "vue",
  });
  assert.equal(defaults.language, undefined);
  assert.equal(buildVpCommand(defaults).args.at(-1), "vue-ts");
  assert.throws(() =>
    validateProjectOptions({
      name: "bad-lang",
      type: "application",
      framework: "vue",
      language: "javascript",
    }),
  );
  assert.throws(() =>
    validateProjectOptions({
      name: "bad-lang",
      type: "application",
      framework: "react",
      language: "TS",
    }),
  );
  assert.throws(() =>
    validateProjectOptions({ name: "workspace", type: "monorepo", language: "js" }),
  );
});
