import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEngineSelection, collectProjectOptions } from "../src/prompts.mjs";
import { cancel, scriptedPrompts } from "../fixtures/scripted-prompts.mjs";

test("勾选引擎规范排序，空列表表示不启用，拒绝未知值/重复及数字输入", () => {
  assert.equal(parseEngineSelection([]), "none");
  assert.equal(parseEngineSelection(["three"]), "three");
  assert.deepEqual(parseEngineSelection(["babylon", "three", "cesium"]), [
    "three",
    "cesium",
    "babylon",
  ]);
  for (const value of [
    "2",
    "three,cesium",
    ["three", "three"],
    ["none", "three"],
    ["unknown"],
    ["__proto__"],
  ])
    assert.throws(() => parseEngineSelection(value));
});

test("多选摘要、Three/Babylon 保护提示与取消", async () => {
  for (const three of [true, false]) {
    const answers = three
      ? ["application", ["babylon", "three"], "none", false]
      : ["application", ["cesium", "babylon"], undefined, true];
    const questions = [];
    const result = await collectProjectOptions(
      {
        name: "prompt-demo",
        framework: "vue",
        language: "ts",
        ui: "none",
        css: "none",
        screen: true,
      },
      scriptedPrompts(answers, { questions }),
    );
    assert.ok(questions.some((question) => question.startsWith("模型保护")));
    assert.ok(questions.at(-1).includes(three ? "three,babylon" : "cesium,babylon"));
    if (three) assert.equal(result, null);
    else assert.deepEqual(result.engines, ["cesium", "babylon"]);
  }
});

test("向导使用具名选项和空格多选，React 隔离 UI，保留默认语言和无引擎路径", async () => {
  const calls = [];
  const result = await collectProjectOptions(
    {},
    scriptedPrompts(
      ["react-demo", "application", "react", undefined, "antd", "tailwindcss", true, [], true],
      { calls },
    ),
  );
  assert.equal(result.language, "ts");
  assert.equal(result.engine, undefined);
  assert.equal(result.modelProtection, undefined);
  const ui = calls.find((call) => call.message === "UI 组件库");
  assert.deepEqual(
    ui.options.map((option) => option.value),
    ["none", "antd", "tdesign"],
  );
  const engine = calls.find((call) => call.kind === "multiselect");
  assert.equal(engine.required, false);
  assert.deepEqual(engine.initialValues, []);
  assert.deepEqual(
    engine.options.map((option) => option.value),
    ["three", "cesium", "babylon"],
  );
  assert.ok(calls.every((call) => !/\[\d\]|输入数字|逗号/.test(call.message)));
  assert.equal(calls.at(-1).kind, "confirm");
  assert.equal(calls.at(-1).initialValue, true);
});

test("每个提示阶段的取消均立即返回，后续提示不执行；真实后端错误继续抛出", async () => {
  const route = [
    "viewer",
    "application",
    "vue",
    "ts",
    "tdesign",
    "unocss",
    true,
    ["three"],
    "embedded",
    true,
  ];
  for (let index = 0; index < route.length; index++) {
    const answers = [...route.slice(0, index), cancel];
    const calls = [];
    assert.equal(await collectProjectOptions({}, scriptedPrompts(answers, { calls })), null);
    assert.equal(calls.length, index + 1);
    assert.deepEqual(answers, []);
  }
  const failure = new Error("prompt failed");
  await assert.rejects(
    collectProjectOptions(
      {},
      {
        text: async () => {
          throw failure;
        },
      },
    ),
    (error) => error === failure,
  );
});
