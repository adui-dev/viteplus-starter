import assert from "node:assert/strict";
import { readFile, writeFile, readdir, unlink } from "node:fs/promises";
import { resolve, join } from "node:path";
import { parseEnv } from "node:util";
import { spawnSync } from "node:child_process";
import { decryptAdui } from "../packages/model-security/src/adui.mjs";
const [directory, base = "/model-check/"] = process.argv.slice(2);
if (!directory || !["/model-check/", "./"].includes(base))
  throw new Error(
    "用法：node scripts/verify-model-app.mjs <已配置模型保护的应用> [/model-check/|./]",
  );
const root = resolve(directory),
  temp = join(root, "verify-model.config.mjs");
async function files(path) {
  const result = [];
  for (const entry of await readdir(path, { withFileTypes: true })) {
    assert.ok(!entry.isSymbolicLink(), "验收目录不接受链接");
    const child = join(path, entry.name);
    if (entry.isDirectory()) result.push(...(await files(child)));
    else result.push(child);
  }
  return result;
}
const configs = (await readdir(root)).filter((name) =>
  /^vite\.config\.(?:ts|js|mts|mjs)$/.test(name),
);
assert.equal(configs.length, 1, "需要唯一 Vite 配置");
const sourcePaths = (await files(join(root, "src/models"))).filter((path) => /\.glb$/i.test(path));
assert.ok(sourcePaths.length, "验收前须将自包含 GLB 放入 src/models");
const sources = await Promise.all(sourcePaths.map((path) => readFile(path)));
const env = parseEnv(await readFile(join(root, ".env.local"), "utf8"));
assert.ok(typeof env.ADUI_MODEL_KEY === "string", "缺少模型 KEY");
const key = await crypto.subtle.importKey(
  "raw",
  Buffer.from(env.ADUI_MODEL_KEY, "base64"),
  "AES-GCM",
  false,
  ["decrypt"],
);
await writeFile(
  temp,
  `import config from './${configs[0]}'\nexport default {...config,base:${JSON.stringify(base)},build:{...config.build,outDir:'dist/model-verify',rolldownOptions:{input:{index:'index.html',model:'model-smoke.html'}}}}\n`,
  { flag: "wx" },
);
try {
  const build = spawnSync(
    process.platform === "win32" ? "vp build --config verify-model.config.mjs" : "vp",
    process.platform === "win32" ? [] : ["build", "--config", "verify-model.config.mjs"],
    { cwd: root, stdio: "inherit", shell: process.platform === "win32" },
  );
  if (build.error) throw build.error;
  assert.equal(build.status, 0, "模型应用构建失败");
  const output = join(root, "dist/model-verify");
  const html = await readFile(join(output, "model-smoke.html"), "utf8");
  assert.ok(
    html.includes(base === "./" ? "./assets/" : "/model-check/assets/"),
    "部署 base 不匹配",
  );
  let count = 0;
  for (const path of await files(output)) {
    assert.ok(!/\.(?:glb|gltf|fbx|obj|mtl)$/i.test(path), "产物包含原模型文件");
    const bytes = await readFile(path);
    assert.ok(!bytes.includes(Buffer.from(env.ADUI_MODEL_KEY)), "产物包含原始密钥字面量");
    assert.ok(!sources.some((source) => bytes.includes(source)), "产物包含模型明文");
    if (path.endsWith(".adui")) {
      const plain = await decryptAdui(
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
        { authorize: async () => ({ key, expiresAt: Date.now() + 10000 }) },
      );
      try {
        assert.ok(
          sources.some((source) => source.equals(Buffer.from(plain))),
          "解密模型与源码不一致",
        );
      } finally {
        new Uint8Array(plain).fill(0);
      }
      count++;
    }
  }
  assert.equal(count, sources.length, "加密模型数量不匹配");
  console.log(
    `模型应用双入口/base/密文解密检查通过：${base}；${count} 个 .adui，无原模型与原始 KEY 字面量`,
  );
} finally {
  await unlink(temp);
}
