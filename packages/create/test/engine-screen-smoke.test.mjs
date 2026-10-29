import { test } from "node:test";
import assert from "node:assert/strict";
import { planBabylon } from "../src/babylon.mjs";
import { planCesium } from "../src/cesium.mjs";

test("双引擎四种框架语言生成独立大屏控件与本地尺寸模块，不依赖旧 AdScreen 快照", async () => {
  for (const [engine, plan] of [
    ["babylon", planBabylon],
    ["cesium", planCesium],
  ])
    for (const framework of ["vue", "react"])
      for (const language of ["ts", "js"]) {
        const { files } = await plan({
          name: "screen-check",
          type: "application",
          framework,
          language,
          screen: true,
          engine,
          modelProtection: "none",
        });
        const ext = framework === "vue" ? "vue" : language === "ts" ? "tsx" : "jsx";
        const app = files[`src/${engine}-smoke/App.${ext}`];
        for (const text of [
          "overlayUnscaled",
          "半宽容器",
          "进入全屏",
          "退出全屏",
          "contain",
          "cover",
          "stretch",
          "none",
        ])
          assert.ok(app.includes(text), text);
        for (const file of ["viewport.mjs", "resolution.mjs", "lazy.mjs"]) {
          assert.ok(files[`src/adui-${engine}/${file}`]);
          assert.ok(!files[`src/adui-${engine}/${file}`].includes("../../screen/"));
        }
        assert.ok(
          !Object.keys(files).some(
            (path) =>
              path.startsWith("src/adui-screen/") ||
              path.startsWith("src/main.") ||
              path.startsWith("src/App."),
          ),
        );
      }
});
