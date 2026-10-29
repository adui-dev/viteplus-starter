import { test } from "node:test";
import assert from "node:assert/strict";
import { parseEngineSelection, collectProjectOptions } from "../src/prompts.mjs";
test("交互引擎数字/名称多选规范排序，保留默认与单选，拒绝混合 None/重复", () => {
  assert.equal(parseEngineSelection(""), "none");
  assert.equal(parseEngineSelection("2"), "three");
  assert.deepEqual(parseEngineSelection("4,2,3"), ["three", "cesium", "babylon"]);
  for (const value of ["2,three", "1,2", "none,babylon", "2,", "unknown", "__proto__"])
    assert.throws(() => parseEngineSelection(value));
});
test("多选摘要、Three/Babylon 保护提示与取消", async () => {
  for (const three of [true, false]) {
    const answers = three ? ["1", "4,2", "3", "n"] : ["1", "3,4", "", "y"],
      questions = [];
    const result = await collectProjectOptions(
      {
        name: "prompt-demo",
        framework: "vue",
        language: "ts",
        ui: "none",
        css: "none",
        screen: true,
      },
      async (question) => {
        questions.push(question);
        return answers.shift();
      },
    );
    assert.equal(
      questions.some((question) => question.startsWith("模型保护")),
      true,
    );
    assert.ok(questions.at(-1).includes(three ? "three,babylon" : "cesium,babylon"));
    if (three) assert.equal(result, null);
    else assert.deepEqual(result.engines, ["cesium", "babylon"]);
  }
});
