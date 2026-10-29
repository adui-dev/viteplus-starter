import { readFile, stat, writeFile, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";

assert.ok(process.argv[2], "用法：node scripts/verify-ui-build.mjs <应用路径> [/ui-check/|./]");
const root = resolve(process.argv[2]),
  base = process.argv[3] ?? "/ui-check/";
assert.ok(["/ui-check/", "./"].includes(base), "仅支持 /ui-check/ 或 ./ 验收 base");
const configs = [];
for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"]) {
  try {
    if ((await stat(join(root, name))).isFile()) configs.push(name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}
assert.equal(configs.length, 1, "无法唯一识别应用配置");
assert.ok((await stat(join(root, "ui-smoke.html"))).isFile(), "先生成 UI Smoke 页面");
const temp = join(root, "verify-ui.config.mjs");
await writeFile(
  temp,
  `import config from './${configs[0]}'\nexport default {...config,base:${JSON.stringify(base)},build:{...config.build,outDir:'dist/ui-verify',rolldownOptions:{...config.build?.rolldownOptions,input:{index:'index.html',smoke:'ui-smoke.html'}}}}\n`,
  { flag: "wx" },
);
try {
  const result = spawnSync(
    process.platform === "win32" ? "vp build --config verify-ui.config.mjs" : "vp",
    process.platform === "win32" ? [] : ["build", "--config", "verify-ui.config.mjs"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "UI 双入口构建失败");
  for (const name of ["index.html", "ui-smoke.html"]) {
    const html = await readFile(join(root, "dist/ui-verify", name), "utf8");
    assert.ok(html.includes('type="module"'), "入口缺少构建后的模块：" + name);
    assert.ok(!html.includes("/src/"), "产物仍指向源码：" + name);
  }
  console.log("UI 双入口构建通过：index,ui-smoke；base=" + base);
} finally {
  await unlink(temp);
}
