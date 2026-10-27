import { test } from "node:test";
import assert from "node:assert/strict";
import { ignoreGeneratedVueComponentDeclarations } from "../src/format-config.mjs";

test("在默认 Vite+ 配置中排除自动生成的组件类型声明", () => {
  const config =
    "import { defineConfig } from 'vite-plus'\nexport default defineConfig({ plugins: [] })";
  const actual = ignoreGeneratedVueComponentDeclarations(config);
  assert.match(actual, /fmt:\s*\{\s*ignorePatterns:\s*\['src\/components\.d\.ts'\]/);
  assert.match(actual, /plugins:\s*\[\]/);
});
test("已有 fmt 配置时不覆盖其他格式选项", () => {
  const input = "export default defineConfig({ fmt: { singleQuote: true }, plugins: [] })";
  const actual = ignoreGeneratedVueComponentDeclarations(input);
  assert.match(actual, /singleQuote:\s*true/);
  assert.match(actual, /ignorePatterns:\s*\['src\/components\.d\.ts'\]/);
});
test("已有 ignorePatterns 时保留原有规则并追加", () => {
  const input =
    "export default defineConfig({ fmt: { ignorePatterns: ['dist/**'] }, plugins: [] })";
  const actual = ignoreGeneratedVueComponentDeclarations(input);
  assert.match(actual, /'src\/components\.d\.ts'/);
  assert.match(actual, /'dist\/\*\*'/);
});
test("重复调用不重复插入", () => {
  const input = "export default defineConfig({plugins: []})";
  const once = ignoreGeneratedVueComponentDeclarations(input);
  const twice = ignoreGeneratedVueComponentDeclarations(once);
  assert.equal(once, twice);
});
test("不会误判嵌套字段，未知配置安全拒绝", () => {
  const input = "export default defineConfig({ lint: { fmt: {} }, plugins: [] })";
  assert.match(ignoreGeneratedVueComponentDeclarations(input), /fmt:\s*\{\s*ignorePatterns/);
  assert.throws(() => ignoreGeneratedVueComponentDeclarations("export default foo"));
  assert.throws(() =>
    ignoreGeneratedVueComponentDeclarations("export default defineConfig({ fmt: makeFmt() })"),
  );
});
