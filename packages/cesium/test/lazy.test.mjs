import { test } from "node:test";
import assert from "node:assert/strict";
import { createLazyGlobe } from "../src/lazy.mjs";
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
