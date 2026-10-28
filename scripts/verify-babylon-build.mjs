import { readFile, writeFile, unlink, stat, readdir } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const [directory, base = "/babylon-check/"] = process.argv.slice(2);
if (!directory || !["/babylon-check/", "./"].includes(base))
  throw new Error("用法：node scripts/verify-babylon-build.mjs <应用路径> [/babylon-check/|./]");
const root = resolve(directory),
  temp = join(root, "verify-babylon.config.mjs"),
  candidates = [];
for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"])
  try {
    await stat(join(root, name));
    candidates.push(name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
assert.equal(candidates.length, 1, "需要唯一 Vite 配置");
await writeFile(
  temp,
  `import config from './${candidates[0]}'\nexport default {...config,base:${JSON.stringify(base)},build:{...config.build,outDir:'dist/babylon-verify',rolldownOptions:{input:{index:'index.html',babylon:'babylon-smoke.html'}}}}\n`,
  { flag: "wx" },
);
try {
  const result = spawnSync(
    process.platform === "win32" ? "vp build --config verify-babylon.config.mjs" : "vp",
    process.platform === "win32" ? [] : ["build", "--config", "verify-babylon.config.mjs"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (result.error) throw result.error;
  assert.equal(result.status, 0, "Babylon 双入口构建失败");
  const html = await readFile(join(root, "dist/babylon-verify/babylon-smoke.html"), "utf8");
  assert.ok(html.includes(base === "./" ? "./assets/" : "/babylon-check/assets/"));
  const assets = await readdir(join(root, "dist/babylon-verify/assets"));
  assert.ok(
    assets.some((name) => name.startsWith("scene-") && name.endsWith(".js")),
    "缺少独立场景分块",
  );
  console.log("Babylon 双入口、场景分块与部署 base 检查通过：" + base);
} finally {
  await unlink(temp);
}
