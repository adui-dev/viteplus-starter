import { test } from "node:test";
import assert from "node:assert/strict";
import { createModelController } from "../src/model.mjs";
import { encryptAdui } from "../../model-security/src/adui.mjs";
function glb(document = { asset: { version: "2.0" } }) {
  const json = new TextEncoder().encode(JSON.stringify(document));
  const size = Math.ceil(json.length / 4) * 4,
    buffer = new ArrayBuffer(20 + size),
    view = new DataView(buffer);
  view.setUint32(0, 0x46546c67, true);
  view.setUint32(4, 2, true);
  view.setUint32(8, buffer.byteLength, true);
  view.setUint32(12, size, true);
  view.setUint32(16, 0x4e4f534a, true);
  new Uint8Array(buffer, 20).fill(32);
  new Uint8Array(buffer, 20, json.length).set(json);
  return buffer;
}
function asset() {
  return {
    added: 0,
    removed: 0,
    disposed: 0,
    addAllToScene() {
      this.added++;
    },
    removeAllFromScene() {
      this.removed++;
    },
    dispose() {
      this.disposed++;
    },
  };
}
test("Babylon 模型替换/失败保留、清除与销毁，加载器拥有独立字节", async () => {
  const first = asset(),
    second = asset(),
    errors = [];
  let calls = 0,
    owned;
  const source = glb(),
    before = new Uint8Array(source).slice();
  const model = createModelController({
    parse: async (buffer) => {
      owned = buffer;
      return ++calls === 1 ? first : second;
    },
    prepare(value) {
      if (value === second) throw Error("bounds");
    },
    onState: (state, message) => errors.push([state, message]),
  });
  assert.equal(await model.load(source), true);
  assert.notEqual(owned, source);
  assert.deepEqual(new Uint8Array(owned), before);
  assert.equal(await model.load(source), false);
  assert.equal(first.disposed, 0);
  assert.equal(second.disposed, 1);
  assert.equal(first.added, 1);
  model.clear();
  model.destroy();
  model.destroy();
  assert.equal(first.disposed, 1);
  assert.deepEqual(new Uint8Array(source), before);
  assert.ok(errors.some(([state]) => state === "error"));
});
test("Babylon 验证在加载器前拒绝外部资源、压缩和未知扩展", async () => {
  const model = createModelController({ parse: () => assert.fail("无效输入不得调用加载器") });
  for (const fields of [
    { buffers: [{ uri: "https://example.com/model.bin", byteLength: 4 }] },
    { images: [{ uri: "texture.png" }] },
    { extensionsUsed: ["KHR_draco_mesh_compression"] },
    { extensionsUsed: ["VENDOR_unknown"] },
    { extensionsRequired: ["KHR_draco_mesh_compression"] },
    { extensionsRequired: ["VENDOR_unknown"] },
  ])
    assert.equal(await model.load(glb({ asset: { version: "2.0" }, ...fields })), false);
  model.destroy();
});
test("Babylon 新模型成功替换旧模型，先前晚到结果不影响当前资产", async () => {
  let finish,
    calls = 0;
  const first = asset(),
    late = asset(),
    latest = asset();
  const model = createModelController({
    parse: () => {
      calls++;
      if (calls === 2)
        return new Promise((done) => {
          finish = done;
        });
      return Promise.resolve(calls === 1 ? first : latest);
    },
  });
  assert.equal(await model.load(glb()), true);
  const pending = model.load(glb());
  assert.equal(await model.load(glb()), true);
  assert.equal(first.disposed, 1);
  finish(late);
  assert.equal(await pending, false);
  assert.equal(late.added, 0);
  assert.equal(late.disposed, 1);
  assert.equal(latest.disposed, 0);
  model.destroy();
  assert.equal(latest.disposed, 1);
});
test("Babylon 晚到解析与卸载不安装，资产只释放一次", async () => {
  let finish;
  const late = asset(),
    model = createModelController({
      parse: () =>
        new Promise((done) => {
          finish = done;
        }),
    });
  const pending = model.load(glb());
  model.destroy();
  finish(late);
  assert.equal(await pending, false);
  assert.equal(late.added, 0);
  assert.equal(late.disposed, 1);
});
test("Babylon .adui 认证成功、篡改拒绝及晚到授权取消", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const encrypted = await encryptAdui(glb(), key, {
      modelId: "helmet",
      keyId: "test",
      format: "glb",
    }),
    grant = {
      key: await crypto.subtle.importKey(
        "raw",
        await crypto.subtle.exportKey("raw", key),
        "AES-GCM",
        false,
        ["decrypt"],
      ),
      expiresAt: Date.now() + 60000,
    };
  let parsed = 0;
  const model = createModelController({
    parse: async () => {
      parsed++;
      return asset();
    },
  });
  assert.equal(
    await model.load(encrypted, { encrypted: true, authorize: async () => grant }),
    true,
  );
  const bad = encrypted.slice(0);
  new Uint8Array(bad)[bad.byteLength - 1] ^= 1;
  assert.equal(await model.load(bad, { encrypted: true, authorize: async () => grant }), false);
  assert.equal(parsed, 1);
  let resolve;
  const pending = model.load(encrypted, {
    encrypted: true,
    authorize: () =>
      new Promise((done) => {
        resolve = done;
      }),
  });
  model.clear();
  resolve(grant);
  assert.equal(await pending, false);
  assert.equal(parsed, 1);
  model.destroy();
});
