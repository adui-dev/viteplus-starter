import { test } from "node:test";
import assert from "node:assert/strict";
import { createModelController, waitModelReady } from "../src/model.mjs";
import { encryptAdui } from "../../model-security/src/adui.mjs";
function glb(fields = {}) {
  const json = new TextEncoder().encode(JSON.stringify({ asset: { version: "2.0" }, ...fields }));
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
function event() {
  const listeners = new Set();
  return {
    addEventListener(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    raise(value) {
      for (const listener of listeners) listener(value);
    },
    count: () => listeners.size,
  };
}
function model() {
  let destroyed = 0;
  return {
    ready: false,
    readyEvent: event(),
    errorEvent: event(),
    isDestroyed: () => destroyed > 0,
    destroy: () => {
      destroyed++;
    },
    count: () => destroyed,
  };
}
function fixture(overrides = {}) {
  let urls = 0;
  const revoked = [],
    added = [],
    removed = [],
    states = [];
  const controller = createModelController({
    create: async () => model(),
    add: (value) => added.push(value),
    remove: (value) => removed.push(value),
    ready: async () => {},
    makeUrl: () => "blob:test/" + ++urls,
    revokeUrl: (value) => revoked.push(value),
    onState: (state, message) => states.push([state, message]),
    ...overrides,
  });
  return { controller, revoked, added, removed, states, urls: () => urls };
}
test("Cesium 校验先于 Blob/引擎，拒绝外部资源与未支持扩展", async () => {
  const f = fixture({ create: () => assert.fail() });
  for (const fields of [
    { buffers: [{ uri: "https://example.com/model.bin" }] },
    { images: [{ uri: "image.png" }] },
    { extensionsUsed: ["KHR_draco_mesh_compression"] },
    { extensionsRequired: ["VENDOR_unknown"] },
    { meshes: [{ primitives: [{ extensions: { KHR_draco_mesh_compression: {} } }] }] },
  ])
    assert.equal(await f.controller.load(glb(fields)), false);
  assert.equal(f.urls(), 0);
  f.controller.destroy();
});
test("Cesium 就绪后替换，失败保留旧资产；移除、销毁和 URL 回收一次", async () => {
  const one = model(),
    bad = model(),
    two = model();
  const list = [one, bad, two];
  const f = fixture({
    create: async () => list.shift(),
    prepare(value) {
      if (value === bad) throw Error("bounds");
    },
  });
  const input = glb(),
    original = new Uint8Array(input).slice();
  assert.equal(await f.controller.load(input), true);
  assert.equal(await f.controller.load(input), false);
  assert.equal(one.count(), 0);
  assert.equal(bad.count(), 1);
  assert.equal(await f.controller.load(input), true);
  assert.equal(one.count(), 1);
  assert.equal(two.show, true);
  f.controller.clear();
  f.controller.destroy();
  f.controller.destroy();
  assert.equal(two.count(), 1);
  assert.equal(f.revoked.length, 3);
  assert.equal(new Set(f.revoked).size, 3);
  assert.deepEqual(new Uint8Array(input), original);
});
test("Cesium 创建失败回收 Blob URL 并允许再次加载", async () => {
  let calls = 0;
  const f = fixture({
    create: async () => {
      if (!calls++) throw Error("parse");
      return model();
    },
  });
  assert.equal(await f.controller.load(glb()), false);
  assert.equal(f.added.length, 0);
  assert.equal(f.revoked.length, 1);
  assert.equal(await f.controller.load(glb()), true);
  f.controller.destroy();
  assert.equal(f.revoked.length, 2);
});
test("Cesium 创建晚到与 GPU 就绪等待中卸载不提交，回收模型及 Blob", async () => {
  let complete;
  const late = model(),
    f = fixture({
      create: () =>
        new Promise((resolve) => {
          complete = resolve;
        }),
    });
  const loading = f.controller.load(glb());
  f.controller.destroy();
  complete(late);
  assert.equal(await loading, false);
  assert.equal(f.added.length, 0);
  assert.equal(late.count(), 1);
  assert.equal(f.revoked.length, 1);
  const asset = model(),
    render = event();
  let started;
  const start = new Promise((resolve) => {
    started = resolve;
  });
  const g = fixture({
    create: async () => asset,
    ready: (value, signal) => {
      const result = waitModelReady(value, {
        signal,
        requestRender() {},
        afterRender: (callback) => render.addEventListener(callback),
      });
      started();
      return result;
    },
  });
  const pending = g.controller.load(glb());
  await start;
  g.controller.destroy();
  assert.equal(await pending, false);
  assert.equal(asset.count(), 1);
  assert.equal(g.revoked.length, 1);
  assert.equal(asset.readyEvent.count() + asset.errorEvent.count() + render.count(), 0);
});
test("Cesium ready/error/超时取消均移除监听；就绪前保持绘制请求", async () => {
  const asset = model(),
    render = event(),
    abort = new AbortController();
  let frames = 0;
  const pending = waitModelReady(asset, {
    signal: abort.signal,
    requestRender: () => frames++,
    afterRender: (callback) => render.addEventListener(callback),
  });
  render.raise();
  assert.equal(frames, 2);
  asset.ready = true;
  asset.readyEvent.raise();
  await pending;
  assert.equal(asset.readyEvent.count() + asset.errorEvent.count() + render.count(), 0);
  for (const reason of ["error", "timeout", "render"]) {
    const candidate = model();
    const waiting = waitModelReady(candidate, {
      signal: new AbortController().signal,
      requestRender() {
        if (reason === "render") throw Error("render");
      },
      afterRender: (callback) => render.addEventListener(callback),
      timeoutMs: 1,
    });
    if (reason === "error") candidate.errorEvent.raise(Error("texture"));
    await assert.rejects(
      waiting,
      reason === "error" ? /texture/ : reason === "render" ? /render/ : /超时/,
    );
    assert.equal(candidate.readyEvent.count() + candidate.errorEvent.count() + render.count(), 0);
  }
});
test("Cesium .adui 认证、篡改与晚到授权取消，不提前创建 Blob", async () => {
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, [
    "encrypt",
    "decrypt",
  ]);
  const encrypted = await encryptAdui(glb(), key, {
    modelId: "helmet",
    keyId: "test",
    format: "glb",
  });
  const grant = {
    key: await crypto.subtle.importKey(
      "raw",
      await crypto.subtle.exportKey("raw", key),
      "AES-GCM",
      false,
      ["decrypt"],
    ),
    expiresAt: Date.now() + 60000,
  };
  const f = fixture();
  assert.equal(
    await f.controller.load(encrypted, { encrypted: true, authorize: async () => grant }),
    true,
  );
  const bad = encrypted.slice(0);
  new Uint8Array(bad)[bad.byteLength - 1] ^= 1;
  assert.equal(
    await f.controller.load(bad, { encrypted: true, authorize: async () => grant }),
    false,
  );
  let complete;
  const pending = f.controller.load(encrypted, {
    encrypted: true,
    authorize: () =>
      new Promise((resolve) => {
        complete = resolve;
      }),
  });
  f.controller.clear();
  complete(grant);
  assert.equal(await pending, false);
  assert.equal(f.urls(), 1);
  assert.equal(f.revoked.length, 1);
  f.controller.destroy();
});
