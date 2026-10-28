import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile, readdir, rm } from "node:fs/promises";
import { join, resolve, dirname, basename } from "node:path";
import { tmpdir } from "node:os";
import { build, createServer } from "vite-plus";
import { aduiModels } from "../packages/model-security/src/vite.mjs";
import { decryptAdui } from "../packages/model-security/src/adui.mjs";
const args = process.argv.slice(2);
if (args.length !== 2 || args[0] !== "--model")
  throw new Error("用法：node scripts/verify-model-build.mjs --model <自包含GLB>");
const original = await readFile(resolve(args[1])),
  root = await mkdtemp(join(tmpdir(), "adui-model-build-"));
const raw = crypto.getRandomValues(new Uint8Array(32)),
  encoded = Buffer.from(raw).toString("base64");
const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
if (dirname(resolve(root)) !== resolve(tmpdir()) || !basename(root).startsWith("adui-model-build-"))
  throw new Error("拒绝使用不受控临时目录");
let server;
async function all(dir) {
  const files = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await all(path)));
    else files.push(path);
  }
  return files;
}
try {
  await mkdir(join(root, "src/models"), { recursive: true });
  await mkdir(join(root, "public"));
  await writeFile(join(root, "src/models/helmet.glb"), original);
  await writeFile(
    join(root, ".env.local"),
    "ADUI_MODEL_KEY_ID=verify-key\nADUI_MODEL_KEY=" + encoded + "\n",
  );
  await writeFile(
    join(root, "index.html"),
    '<div id="app"></div><script type="module" src="/main.js"></script>',
  );
  for (const mode of ["external", "embedded"]) {
    await writeFile(
      join(root, "main.js"),
      'import models from "virtual:adui-models";' +
        (mode === "embedded"
          ? 'import {authorize} from "virtual:adui-model-key";window.modelAuthorize=authorize;'
          : "") +
        'document.getElementById("app").textContent=JSON.stringify(models);',
    );
    await build({
      root,
      configFile: false,
      logLevel: "silent",
      base: "./",
      plugins: [aduiModels({ keyMode: mode })],
      build: { outDir: "dist-" + mode, sourcemap: true },
    });
    const paths = await all(join(root, "dist-" + mode));
    let encrypted = 0,
      secret = false;
    for (const path of paths) {
      const bytes = await readFile(path);
      assert.ok(!/\.(glb|gltf|fbx|obj)$/i.test(path));
      assert.ok(!bytes.includes(original));
      secret ||= bytes.includes(Buffer.from(encoded));
      if (path.endsWith(".adui")) {
        encrypted++;
        const plain = await decryptAdui(
          bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.length),
          { authorize: async () => ({ key, expiresAt: Date.now() + 10000 }) },
        );
        assert.deepEqual(Buffer.from(plain), original);
        new Uint8Array(plain).fill(0);
      }
    }
    assert.equal(encrypted, 1);
    assert.equal(secret, false);
    console.log(mode + ": build/decrypt passed; plaintext=false; embeddedKey=" + secret);
  }
  const devEnv = join(root, "model-secrets.private");
  await writeFile(devEnv, "ADUI_MODEL_KEY_ID=verify-key\nADUI_MODEL_KEY=" + encoded + "\n");
  server = await createServer({
    root,
    configFile: false,
    logLevel: "silent",
    base: "/demo/",
    plugins: [aduiModels({ keyMode: "embedded", envFile: "model-secrets.private" })],
    server: { host: "127.0.0.1", port: 0 },
  });
  await server.listen();
  const address = server.httpServer.address(),
    origin = "http://127.0.0.1:" + address.port;
  assert.equal((await fetch(origin + "/demo/src/models/helmet.glb")).status, 403);
  assert.equal((await fetch(origin + "/demo/.env.local")).status, 403);
  assert.equal((await fetch(origin + "/demo/model-secrets.private")).status, 403);
  const main = await (await fetch(origin + "/demo/main.js")).text(),
    moduleUrl = /from\s+["']([^"']*virtual:adui-models[^"']*)/.exec(main)?.[1];
  assert.ok(moduleUrl);
  const catalog = await (await fetch(new URL(moduleUrl, origin))).text(),
    assetUrl = /url:\s*["']([^"']+\.adui)/.exec(catalog)?.[1];
  assert.ok(assetUrl);
  assert.equal(
    Buffer.from(await (await fetch(new URL(assetUrl, origin))).arrayBuffer())
      .subarray(0, 4)
      .toString(),
    "ADUI",
  );
  const first = assetUrl;
  await writeFile(join(root, "src/models/helmet.glb"), original);
  // Explicitly exercise the same invalidation hook; no timing dependency on filesystem watchers.
  const plugin = server.config.plugins.find((value) => value.name === "adui-encrypted-models");
  plugin.handleHotUpdate({ file: join(root, "src/models/helmet.glb"), server });
  const changed = await (await fetch(new URL(moduleUrl, origin))).text();
  assert.notEqual(/url:\s*["']([^"']+\.adui)/.exec(changed)?.[1], first);
  const keyUrl = /from\s+["']([^"']*virtual:adui-model-key[^"']*)/.exec(main)?.[1];
  assert.ok(keyUrl);
  await (await fetch(new URL(keyUrl, origin))).text();
  await writeFile(devEnv, "ADUI_MODEL_KEY_ID=rotated-key\nADUI_MODEL_KEY=" + encoded + "\n");
  plugin.handleHotUpdate({ file: devEnv, server });
  const rotated = await (await fetch(new URL(keyUrl, origin))).text();
  assert.ok(rotated.includes("rotated-key"));
  console.log("dev: plaintext/key HTTP 403, encrypted HTTP 200, model change re-encrypted");
  console.log("dev: env rotation invalidates both catalog and runtime key");
} finally {
  await server?.close();
  raw.fill(0);
  await rm(root, { recursive: true, force: true });
}
