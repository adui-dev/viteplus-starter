import { test } from "node:test";
import assert from "node:assert/strict";
import { injectStarterPlugins, repairLegacyStarterConfig } from "../src/vite-config.mjs";

test("普通插件数组可安全扩展", () => {
  const output = injectStarterPlugins(
    "import { defineConfig } from 'vite-plus'\nexport default defineConfig({plugins: [vue()]})",
    { imports: ["import UnoCSS from 'unocss/vite'"], plugins: ["UnoCSS()"] },
  );
  assert.match(output, /plugins:\s*\[\s*UnoCSS\(\),/);
});
test("lazyPlugins 回调中插入插件", () => {
  const output = injectStarterPlugins(
    "import { defineConfig, lazyPlugins } from 'vite-plus'\nexport default defineConfig({plugins:lazyPlugins(() => [vue()])})",
    { imports: ["import UnoCSS from 'unocss/vite'"], plugins: ["UnoCSS()"] },
  );
  assert.match(output, /lazyPlugins\(\(\) => \[\s*UnoCSS\(\),/);
});
test("无插件数组可新增 Vite+ lazyPlugins", () => {
  const output = injectStarterPlugins(
    "import { defineConfig } from 'vite-plus'\nexport default defineConfig({staged:{'*':'vp check --fix'}})",
    { imports: ["import UnoCSS from 'unocss/vite'"], plugins: ["UnoCSS()"] },
  );
  assert.match(output, /plugins: lazyPlugins/);
  assert.match(output, /staged:/);
});
test("嵌套 lint.plugins 不会被当成 Vite 插件", () => {
  const output = injectStarterPlugins(
    "import { defineConfig } from 'vite-plus'\nexport default defineConfig({lint:{plugins:['typescript']}})",
    { imports: ["import UnoCSS from 'unocss/vite'"], plugins: ["UnoCSS()"] },
  );
  assert.match(output, /plugins: lazyPlugins/);
  assert.match(output, /lint:\{plugins:\['typescript'\]\}/);
});
test("未知结构保守拒绝修改", () => {
  assert.throws(() =>
    injectStarterPlugins("export default {plugins: []}", {
      imports: ["import UnoCSS from 'unocss/vite'"],
      plugins: ["UnoCSS()"],
    }),
  );
  assert.throws(() =>
    injectStarterPlugins("export default defineConfig({plugins: makePlugins()})", {
      imports: ["import UnoCSS from 'unocss/vite'"],
      plugins: ["UnoCSS()"],
    }),
  );
});

test("旧版配置可以保留已有框架插件并消除 TS2307 导入", () => {
  const legacy =
    "import { starterPlugins } from './starter.plugins'\nexport default defineConfig({plugins: [vue(), ...starterPlugins()]})";
  const result = repairLegacyStarterConfig(legacy, {
    imports: ["import UnoCSS from 'unocss/vite'"],
    plugins: ["UnoCSS()"],
  });
  assert.match(result, /vue\(\)/);
  assert.match(result, /UnoCSS\(\)/);
  assert.doesNotMatch(result, /starter\.plugins|starterPlugins/);
});
