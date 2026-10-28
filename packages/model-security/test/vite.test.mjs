import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { aduiModels } from "../src/vite.mjs";
import { decryptAdui } from "../src/adui.mjs";
async function fixture(t, command = "build", base = "/") {
  const root = await mkdtemp(join(tmpdir(), "adui-plugin-"));
  t.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(join(root, "src/models"), { recursive: true });
  await mkdir(join(root, "public"));
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const env =
    "ADUI_MODEL_KEY_ID=test-key\nADUI_MODEL_KEY=" + Buffer.from(raw).toString("base64") + "\n";
  await writeFile(join(root, ".env.local"), env);
  const text = '{"asset":{"version":"2.0"}}',
    json = Buffer.from(text.padEnd(Math.ceil(text.length / 4) * 4, " "));
  const plain = Buffer.alloc(20 + json.length);
  plain.writeUInt32LE(0x46546c67);
  plain.writeUInt32LE(2, 4);
  plain.writeUInt32LE(plain.length, 8);
  plain.writeUInt32LE(json.length, 12);
  plain.writeUInt32LE(0x4e4f534a, 16);
  plain.set(json, 20);
  const model = join(root, "src/models/helmet.glb");
  await writeFile(model, plain);
  const plugin = aduiModels({ keyMode: "external" });
  plugin.configResolved({
    root,
    command,
    base,
    build: { outDir: "dist" },
    publicDir: join(root, "public"),
  });
  const emitted = [],
    watched = [];
  const context = {
    addWatchFile: (path) => watched.push(path),
    emitFile: (asset) => {
      emitted.push(asset);
      return "REF" + emitted.length;
    },
  };
  const start = () => plugin.buildStart.call(context);
  return { root, raw, env, plain, model, plugin, emitted, watched, context, start };
}
test("自动扫描封装、虚拟目录只含 .adui 引用，原件与密钥不进入模块", async (t) => {
  const f = await fixture(t);
  await f.start();
  const id = f.plugin.resolveId("virtual:adui-models"),
    result = await f.plugin.load.call(f.context, id);
  assert.match(result.code, /ROLLUP_FILE_URL_REF1/);
  assert.ok(!result.code.includes(Buffer.from(f.raw).toString("base64")));
  assert.match(f.emitted[0].fileName, /^models\/[a-f0-9]+\.adui$/);
  const key = await crypto.subtle.importKey("raw", f.raw, "AES-GCM", false, ["decrypt"]);
  const source = f.emitted[0].source;
  const plain = await decryptAdui(source.buffer, {
    authorize: async () => ({ key, expiresAt: Date.now() + 10000 }),
  });
  assert.deepEqual(Buffer.from(plain), f.plain);
  assert.ok(f.watched.includes(f.model));
  for (const query of ["", "?url", "?raw", "?inline"])
    assert.throws(() => f.plugin.resolveId("./helmet.glb" + query), /禁止直接导入/);
});
test("embedded 拆分密钥可正确解密，external 禁止密钥模块；域名限制失败关闭", async (t) => {
  const f = await fixture(t);
  await f.start();
  await assert.rejects(
    f.plugin.load.call(f.context, f.plugin.resolveId("virtual:adui-model-key")),
    /外置/,
  );
  const plugin = aduiModels({ keyMode: "embedded" });
  plugin.configResolved({
    root: f.root,
    command: "build",
    base: "/",
    build: { outDir: "dist" },
    publicDir: join(f.root, "public"),
  });
  await plugin.buildStart.call(f.context);
  const module = await plugin.load.call(f.context, plugin.resolveId("virtual:adui-model-key"));
  assert.ok(!module.code.includes(Buffer.from(f.raw).toString("base64")));
  const loaded = await import("data:text/javascript," + encodeURIComponent(module.code));
  const grant = await loaded.authorize({ keyId: "test-key" });
  const exported = await plugin.load.call(f.context, plugin.resolveId("virtual:adui-models"));
  assert.ok(exported.code.includes("ROLLUP_FILE_URL"));
  assert.deepEqual(
    Buffer.from(await decryptAdui(f.emitted[0].source.buffer, { authorize: async () => grant })),
    f.plain,
  );
  await plugin.generateBundle.handler({}, { "index.js": { type: "chunk", code: module.code } });
  await assert.rejects(
    plugin.generateBundle.handler(
      {},
      { "index.js": { type: "chunk", code: Buffer.from(f.raw).toString("base64") } },
    ),
    /泄漏/,
  );
  await writeFile(join(f.root, ".env.local"), f.env + "ADUI_MODEL_ALLOWED_HOSTS=example.test\n");
  await plugin.buildStart.call(f.context);
  const restricted = await plugin.load.call(f.context, plugin.resolveId("virtual:adui-model-key"));
  const blocked = await import("data:text/javascript," + encodeURIComponent(restricted.code));
  await assert.rejects(blocked.authorize({ keyId: "test-key" }), /域名/);
  assert.throws(() => aduiModels({ keyMode: "unknown" }), /keyMode/);
});
test("阻止 public 明文/密钥、内联明文、Base64/二进制密钥及后写入泄漏", async (t) => {
  const f = await fixture(t);
  await f.start();
  const check = (source) =>
    f.plugin.generateBundle.handler({}, { "assets/test.js": { type: "chunk", code: source } });
  for (const secret of [
    Buffer.from(f.raw).toString("base64"),
    Buffer.from(f.raw).toString("hex"),
    f.plain.toString("base64"),
  ])
    await assert.rejects(check(secret), /泄漏|明文/);
  await assert.rejects(
    f.plugin.generateBundle.handler({}, { "model.bin": { type: "asset", source: f.plain } }),
    /明文/,
  );
  await writeFile(join(f.root, "public/secret.txt"), Buffer.from(f.raw));
  await assert.rejects(check("safe"), /泄漏/);
  await rm(join(f.root, "public/secret.txt"));
  await mkdir(join(f.root, "dist"));
  await writeFile(join(f.root, "dist/renamed.bin"), f.plain);
  await assert.rejects(f.plugin.writeBundle.handler({ dir: join(f.root, "dist") }), /明文/);
});
test("开发服务只返回加密模型，拒绝源模型、密钥和编码 URL，支持 base 与 HEAD", async (t) => {
  const f = await fixture(t, "serve", "/demo/");
  await f.start();
  let handler;
  f.plugin.configureServer({
    watcher: { add() {}, on() {} },
    middlewares: { use: (value) => (handler = value) },
  });
  const module = await f.plugin.load.call(f.context, f.plugin.resolveId("virtual:adui-models"));
  const url = /url:"([^"]+)"/.exec(module.code)[1];
  async function request(path, method = "GET") {
    let ended = false,
      next = false,
      body;
    const headers = {};
    const res = {
      statusCode: 200,
      setHeader: (key, value) => (headers[key] = value),
      end: (value) => {
        ended = true;
        body = value;
      },
    };
    await handler({ url: path, method }, res, () => {
      next = true;
    });
    return { status: res.statusCode, headers, body, ended, next };
  }
  const encrypted = await request(url);
  assert.equal(encrypted.status, 200);
  assert.equal(Buffer.from(encrypted.body).subarray(0, 4).toString(), "ADUI");
  assert.equal((await request(url, "HEAD")).body, undefined);
  assert.equal((await request(url, "POST")).status, 405);
  for (const path of [
    "/src/models/helmet.glb",
    "/src/models/helmet%2eglb?raw",
    "/src/models/helmet%252eglb",
    "/.env.local",
    "/demo/.env.local",
    "/@fs/" + f.model.replaceAll("\\", "/"),
  ])
    assert.equal((await request(path)).status, 403, path);
  assert.equal((await request("/src/main.js")).next, true);
});
test("缺失密钥、VITE_ 暴露、public 配置、链接与不支持模型失败关闭", async (t) => {
  const f = await fixture(t);
  await writeFile(
    join(f.root, ".env.local"),
    f.env + "VITE_SECRET=" + Buffer.from(f.raw).toString("base64") + "\n",
  );
  await assert.rejects(f.start(), /VITE_/);
  await writeFile(join(f.root, ".env.local"), "");
  await assert.rejects(f.start(), /配置/);
  await writeFile(join(f.root, ".env.local"), f.env);
  await writeFile(join(f.root, "src/models/model.obj"), "unsupported");
  await assert.rejects(f.start(), /仅接受/);
  await rm(join(f.root, "src/models/model.obj"));
  const outside = await mkdtemp(join(tmpdir(), "adui-outside-"));
  t.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, join(f.root, "src/models/linked"), "junction");
  await assert.rejects(f.start(), /链接/);
  assert.throws(
    () =>
      aduiModels({ modelsDir: "public/models" }).configResolved({
        root: f.root,
        base: "/",
        build: { outDir: "dist" },
        publicDir: join(f.root, "public"),
      }),
    /public/,
  );
});
