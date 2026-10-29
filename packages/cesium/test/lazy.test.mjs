import { test } from "node:test";
import assert from "node:assert/strict";
import { createLazyGlobe } from "../src/lazy.mjs";
import { encryptAdui } from "../../model-security/src/adui.mjs";
test("Cesium 目录下载先于初始化，清除/外部取消/卸载丢弃旧下载", async (t) => {
  const previous = {
    fetch: globalThis.fetch,
    location: globalThis.location,
    resize: globalThis.ResizeObserver,
  };
  globalThis.location = { href: "http://localhost/model-smoke.html" };
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {}
  };
  t.after(() => {
    globalThis.fetch = previous.fetch;
    globalThis.location = previous.location;
    globalThis.ResizeObserver = previous.resize;
  });
  const key = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const encrypted = await encryptAdui(new ArrayBuffer(20), key, {
    format: "glb",
    modelId: "helmet",
    keyId: "demo",
  });
  const asset = { url: "/models/helmet.adui", modelId: "helmet", keyId: "demo" };
  let complete,
    signal,
    creates = 0,
    models = 0;
  const authorize = () => {};
  globalThis.fetch = async (_url, options) => {
    signal = options.signal;
    return new Promise((resolve) => {
      complete = resolve;
    });
  };
  const globe = createLazyGlobe(
    {},
    {
      load: async () => ({
        createGlobe() {
          creates++;
          return {
            resize() {},
            isDestroyed: () => false,
            destroy() {},
            scene: { requestRender() {} },
            cancelModelLoad() {},
            clearModel() {},
            async loadModel(_bytes, options) {
              models++;
              assert.equal(options.encrypted, true);
              assert.equal(options.authorize, authorize);
              return true;
            },
          };
        },
      }),
    },
  );
  const stale = globe.loadBundledModel(asset, { authorize });
  globe.clearModel();
  assert.equal(signal.aborted, true);
  complete(new Response(encrypted));
  assert.equal(await stale, false);
  assert.equal(creates, 0);
  globalThis.fetch = async () => new Response(encrypted);
  assert.equal(await globe.loadBundledModel(asset, { authorize }), true);
  assert.equal(creates, 1);
  assert.equal(models, 1);
  const abort = new AbortController();
  abort.abort();
  assert.equal(await globe.loadBundledModel(asset, { authorize, signal: abort.signal }), false);
  assert.equal(models, 1);
  globe.destroy();
  assert.equal(await globe.loadBundledModel(asset, { authorize }), false);
});
test("Cesium 点击才导入，共用加载；卸载期间导入完成不创建场景", async (t) => {
  const previous = globalThis.ResizeObserver;
  let disconnect = 0;
  globalThis.ResizeObserver = class {
    observe() {}
    disconnect() {
      disconnect++;
    }
  };
  t.after(() => {
    globalThis.ResizeObserver = previous;
  });
  let resolve,
    calls = 0,
    created = 0;
  const globe = createLazyGlobe(
    {},
    {
      load: () => {
        calls++;
        return new Promise((done) => {
          resolve = done;
        });
      },
    },
  );
  assert.equal(calls, 0);
  const first = globe.load();
  assert.equal(globe.load(), first);
  await Promise.resolve();
  globe.destroy();
  globe.destroy();
  resolve({
    createGlobe() {
      created++;
    },
  });
  await first;
  assert.equal(calls, 1);
  assert.equal(created, 0);
  assert.equal(disconnect, 1);
});
test("Cesium 加载失败可重试，尺寸变化请求绘制，销毁一次", async (t) => {
  const previous = globalThis.ResizeObserver;
  let resizeCallback;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resizeCallback = callback;
    }
    observe() {}
    disconnect() {}
  };
  t.after(() => {
    globalThis.ResizeObserver = previous;
  });
  let attempts = 0,
    destroyed = 0,
    resized = 0,
    rendered = 0;
  const errors = [],
    states = [];
  const viewer = {
    isDestroyed: () => Boolean(destroyed),
    destroy: () => destroyed++,
    resize: () => resized++,
    scene: { requestRender: () => rendered++ },
  };
  const globe = createLazyGlobe(
    {},
    {
      load: async () => {
        if (!attempts++) throw Error("failed");
        return { createGlobe: () => viewer };
      },
      onError: (value) => errors.push(value),
      onState: (value) => states.push(value),
    },
  );
  await globe.load();
  assert.equal(errors.length, 1);
  await globe.load();
  resizeCallback();
  assert.equal(resized, 1);
  assert.equal(rendered, 1);
  assert.ok(states.some((value) => value.ready));
  globe.destroy();
  globe.destroy();
  resizeCallback();
  assert.equal(destroyed, 1);
  assert.equal(resized, 1);
  assert.equal(states.at(-1).disposed, true);
});
