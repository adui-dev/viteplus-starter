import assert from "node:assert/strict";

export const cancel = Symbol("cancel");
export function scriptedPrompts(answers, { questions = [], messages = [], calls = [] } = {}) {
  const next = (kind, options) => {
    questions.push(options.message);
    calls.push({ kind, ...options });
    assert.ok(answers.length, "不应多询问：" + options.message);
    return answers.shift();
  };
  return {
    isCancel: (value) => value === cancel,
    async text(options) {
      for (;;) {
        const answer = next("text", options);
        if (answer === cancel) return answer;
        const error = options.validate?.(answer);
        if (!error) return answer;
        messages.push(error);
      }
    },
    async select(options) {
      const value = next("select", options);
      if (value === cancel) return value;
      const answer = value ?? options.initialValue;
      assert.ok(
        options.options.some((option) => option.value === answer),
        "非法模拟单选值：" + answer,
      );
      return answer;
    },
    async multiselect(options) {
      const answer = next("multiselect", options);
      if (answer === cancel) return answer;
      assert.ok(Array.isArray(answer));
      assert.ok(answer.every((value) => options.options.some((option) => option.value === value)));
      return answer;
    },
    async confirm(options) {
      const value = next("confirm", options);
      if (value === cancel) return value;
      const answer = value ?? options.initialValue;
      assert.equal(typeof answer, "boolean");
      return answer;
    },
  };
}
