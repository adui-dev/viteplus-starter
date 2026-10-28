import { test } from "node:test";
import assert from "node:assert/strict";
import { createLazyScene } from "../src/lazy.mjs";
import { createRuntime } from "../src/runtime.mjs";
function fixture(t) {
  const previous = globalThis.ResizeObserver;
  let resized,
    disconnected = 0,
    attached = 0;
  globalThis.ResizeObserver = class {
    constructor(callback) {
      resized = callback;
    }
    observe() {}
    disconnect() {
      disconnected++;
    }
  };
  t.after(() => {
    globalThis.ResizeObserver = previous;
  });
  const host = {
    ownerDocument: {
      createElement() {
        return {
          setAttribute() {},
          remove() {
            if (this.added) {
              attached--;
              this.added = false;
            }
          },
        };
      },
    },
    append(canvas) {
      attached++;
      canvas.added = true;
    },
  };
  return { host, resize: () => resized(), count: () => attached, disconnected: () => disconnected };
}
test("Babylon 点击才导入、请求共用；晚到导入不创建已卸载场景", async (t) => {
  const f = fixture(t);
  let calls = 0,
    complete,
    created = 0;
  const lazy = createLazyScene(f.host, {
    load: () => {
      calls++;
      return new Promise((done) => {
        complete = done;
      });
    },
  });
  assert.equal(calls, 0);
  const pending = lazy.load();
  assert.equal(lazy.load(), pending);
  await Promise.resolve();
  lazy.destroy();
  complete({
    createScene() {
      created++;
    },
  });
  await pending;
  assert.equal(created, 0);
  assert.equal(f.count(), 0);
  assert.equal(f.disconnected(), 1);
  lazy.destroy();
  assert.equal(f.disconnected(), 1);
});
test("Babylon 失败可重试，帧错误清理画布、尺寸更新及卸载只销毁一次", async (t) => {
  const f = fixture(t),
    errors = [],
    states = [];
  let attempts = 0,
    destroyed = 0,
    resized = 0,
    frameError;
  const lazy = createLazyScene(f.host, {
    load: async () => {
      if (!attempts++) throw Error("load failed");
      return {
        createScene(_canvas, onError) {
          frameError = onError;
          return {
            resize() {
              resized++;
            },
            destroy() {
              destroyed++;
            },
          };
        },
      };
    },
    onState: (value) => states.push(value),
    onError: (value) => errors.push(value),
  });
  await lazy.load();
  assert.equal(errors.length, 1);
  await lazy.load();
  assert.equal(f.count(), 1);
  f.resize();
  assert.equal(resized, 1);
  frameError("render failed");
  assert.equal(f.count(), 0);
  assert.equal(destroyed, 1);
  assert.equal(states.at(-1).ready, false);
  await lazy.load();
  assert.equal(f.count(), 1);
  lazy.destroy();
  lazy.destroy();
  assert.equal(destroyed, 2);
  assert.equal(f.count(), 0);
});
test("Babylon 同步初始化错误不报告 ready，也不残留画布", async (t) => {
  const f = fixture(t),
    states = [];
  let destroyed = 0;
  const lazy = createLazyScene(f.host, {
    load: async () => ({
      createScene(_canvas, onError) {
        onError("failed");
        return {
          destroy() {
            destroyed++;
          },
        };
      },
    }),
    onState: (value) => states.push(value),
  });
  await lazy.load();
  assert.equal(destroyed, 1);
  assert.equal(f.count(), 0);
  assert.ok(!states.some((value) => value.ready));
  lazy.destroy();
});
test("Babylon 初始化异常与帧错误停止循环并释放 Scene/Engine", () => {
  for (const fail of ["initialize", "render", null]) {
    let render,
      stopped = 0,
      sceneDisposed = 0,
      engineDisposed = 0,
      resized = 0,
      errors = 0;
    const options = {
      createEngine: () => ({
        runRenderLoop(callback) {
          render = callback;
        },
        stopRenderLoop() {
          stopped++;
        },
        dispose() {
          engineDisposed++;
        },
        resize() {
          resized++;
        },
      }),
      createScene: () => ({
        render() {
          if (fail === "render") throw Error("frame");
        },
        dispose() {
          sceneDisposed++;
        },
      }),
      initialize() {
        if (fail === "initialize") throw Error("init");
      },
      onError() {
        errors++;
      },
    };
    if (fail === "initialize") assert.throws(() => createRuntime({}, options), /init/);
    else {
      const scene = createRuntime({}, options);
      scene.resize();
      render();
      scene.destroy();
      scene.destroy();
      scene.resize();
      assert.equal(resized, 1);
      assert.equal(errors, fail === "render" ? 1 : 0);
    }
    assert.equal(stopped, 1);
    assert.equal(sceneDisposed, 1);
    assert.equal(engineDisposed, 1);
  }
});
