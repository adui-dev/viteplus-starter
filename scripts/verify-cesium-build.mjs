import { readFile, writeFile, unlink, stat } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const [directory, base = "/cesium-check/"] = process.argv.slice(2);
if (!directory || !["/cesium-check/", "./"].includes(base))
  throw new Error("用法：node scripts/verify-cesium-build.mjs <应用路径> [/cesium-check/|./]");
const root = resolve(directory),
  temp = join(root, "verify-cesium.config.mjs");
const candidates = [];
for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"])
  try {
    await stat(join(root, name));
    candidates.push(name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
assert.equal(candidates.length, 1, "需要唯一的 Vite 配置");
await writeFile(
  temp,
  `import config from './${candidates[0]}'\nexport default {...config,base:${JSON.stringify(base)},build:{...config.build,outDir:'dist/cesium-verify',rolldownOptions:{input:{index:'index.html',cesium:'cesium-smoke.html'}}}}\n`,
  { flag: "wx" },
);
try {
  const result = spawnSync(
    process.platform === "win32" ? "vp build --config verify-cesium.config.mjs" : "vp",
    process.platform === "win32" ? [] : ["build", "--config", "verify-cesium.config.mjs"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "Cesium 双入口构建失败");
  for (const name of ["Workers", "ThirdParty", "Assets", "Widgets"])
    assert.ok((await stat(join(root, "dist/cesium-verify/adui-cesium", name))).isDirectory());
  const html = await readFile(join(root, "dist/cesium-verify/cesium-smoke.html"), "utf8");
  assert.ok(html.includes(base === "./" ? "./assets/" : "/cesium-check/assets/"));
  console.log("Cesium 双入口、四类静态资源与部署 base 检查通过：" + base);
} finally {
  await unlink(temp);
}
