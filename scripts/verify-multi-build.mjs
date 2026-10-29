import { writeFile, unlink, stat, readFile } from "node:fs/promises";
import { resolve, join } from "node:path";
import { spawnSync } from "node:child_process";
import assert from "node:assert/strict";
const root = resolve(process.argv[2]),
  temp = join(root, "verify-multi.config.mjs"),
  configs = [],
  input = { index: "index.html" };
for (const name of ["vite.config.ts", "vite.config.js", "vite.config.mts", "vite.config.mjs"])
  try {
    await stat(join(root, name));
    configs.push(name);
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
assert.equal(configs.length, 1);
for (const name of ["three", "cesium", "babylon", "model"])
  try {
    await stat(join(root, name + "-smoke.html"));
    input[name] = name + "-smoke.html";
  } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
assert.ok(
  ["three", "cesium", "babylon"].filter((name) => input[name]).length >= 2,
  "至少需要两种引擎验收页",
);
await writeFile(
  temp,
  `import config from './${configs[0]}'\nexport default {...config,base:'/multi-check/',build:{...config.build,outDir:'dist/multi-verify',rolldownOptions:{output:{strictExecutionOrder:true,codeSplitting:{includeDependenciesRecursively:false,groups:[{name:"cesium-engine",test:/node_modules.*cesium/},{name:"babylon-engine",test:/node_modules.*babylonjs/},{name:"three-engine",test:/node_modules.*three/}]}},input:${JSON.stringify(input)}}}}\n`,
  { flag: "wx" },
);
try {
  const result = spawnSync(
    process.platform === "win32" ? "vp build --config verify-multi.config.mjs" : "vp",
    process.platform === "win32" ? [] : ["build", "--config", "verify-multi.config.mjs"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  assert.equal(result.status, 0, "多入口构建失败");
  for (const file of Object.values(input))
    assert.ok((await stat(join(root, "dist/multi-verify", file))).isFile());
  for (const name of ["three", "cesium", "babylon"].filter((name) => input[name])) {
    const html = await readFile(join(root, "dist/multi-verify", input[name]), "utf8");
    const pending = [...html.matchAll(/(?:src|href)="[^"]*assets\/([^"]+\.js)"/g)].map(
        (match) => "assets/" + match[1],
      ),
      seen = new Set();
    while (pending.length) {
      const file = pending.pop();
      if (seen.has(file)) continue;
      seen.add(file);
      assert.ok(
        !/(?:three|cesium|babylon)-engine-/.test(file),
        "页面初始静态依赖提前加载引擎：" + file,
      );
      const source = await readFile(join(root, "dist/multi-verify", file), "utf8");
      for (const match of source.matchAll(/(?:from|import)\s*["']\.\/([^"']+\.js)["']/g))
        pending.push("assets/" + match[1]);
    }
  }
  if (input.cesium)
    for (const name of ["Workers", "Assets", "ThirdParty", "Widgets"])
      assert.ok((await stat(join(root, "dist/multi-verify/adui-cesium", name))).isDirectory());
  console.log("多引擎联合构建通过：" + Object.keys(input).join(","));
} finally {
  await unlink(temp);
}
