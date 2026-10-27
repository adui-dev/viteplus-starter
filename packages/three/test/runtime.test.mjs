import { test } from "node:test";
import assert from "node:assert/strict";
import { bufferSize, mountScene } from "../src/runtime.mjs";

function fixture({ fail = false } = {}) {
  const calls = {
    geometry: 0,
    material: 0,
    renderer: 0,
    loss: 0,
    renders: 0,
    observer: 0,
    status: [],
    errors: [],
  };
  const view = new EventTarget();
  view.devicePixelRatio = 1;
  view.ResizeObserver = class {
    constructor(cb) {
      calls.resize = cb;
    }
    observe() {}
    disconnect() {
      calls.observer++;
    }
  };
  const canvas = new EventTarget();
  canvas.style = {};
  canvas.width = 300;
  canvas.height = 150;
  canvas.setAttribute = () => {};
  canvas.remove = () => {
    calls.removed = true;
  };
  canvas.getBoundingClientRect = () => ({ left: 40, top: 80, width: 800, height: 400 });
  const host = {
    clientWidth: 800,
    clientHeight: 400,
    ownerDocument: { defaultView: view },
    appendChild(node) {
      assert.equal(node, canvas);
    },
  };
  const THREE = {
    WebGLRenderer: class {
      constructor() {
        calls.instance = this;
        this.domElement = canvas;
        this.capabilities = { maxTextureSize: 8192 };
      }
      setAnimationLoop(fn) {
        calls.loop = fn;
      }
      setPixelRatio(value) {
        calls.dpr = value;
      }
      setSize(w, h) {
        calls.size = [w, h];
        canvas.width = Math.floor(w * calls.dpr);
        canvas.height = Math.floor(h * calls.dpr);
      }
      render() {
        calls.renders++;
      }
      dispose() {
        calls.renderer++;
      }
      forceContextLoss() {
        calls.loss++;
      }
    },
    Scene: class {
      add() {}
      updateMatrixWorld() {}
    },
    Color: class {},
    PerspectiveCamera: class {
      constructor() {
        this.position = {};
        calls.camera = this;
      }
      updateProjectionMatrix() {
        calls.projection = true;
      }
      updateMatrixWorld() {}
    },
    BoxGeometry: class {
      dispose() {
        calls.geometry++;
      }
    },
    MeshBasicMaterial: class {
      constructor() {
        this.color = {
          set: (value) => {
            calls.color = value;
          },
        };
      }
      dispose() {
        calls.material++;
      }
    },
    Mesh: class {
      constructor() {
        if (fail) throw new Error("初始化失败");
        this.rotation = {};
      }
    },
    Raycaster: class {
      setFromCamera(point) {
        calls.point = point;
      }
      intersectObject() {
        return Math.abs(calls.point.x) < 0.5 ? [{}] : [];
      }
    },
  };
  return {
    calls,
    host,
    view,
    canvas,
    THREE,
    options: {
      onStatus: (status) => calls.status.push(status),
      onError: (error) => calls.errors.push(error.message),
    },
  };
}
test("绘图缓冲尺寸限制 DPR 与最大边长，拒绝非法参数", () => {
  assert.deepEqual(bufferSize(960, 540, 2), {
    width: 960,
    height: 540,
    pixelRatio: 2,
    bufferWidth: 1920,
    bufferHeight: 1080,
  });
  assert.equal(bufferSize(1920, 1080, 4).pixelRatio, 2);
  assert.equal(bufferSize(10000, 5000, 2).bufferWidth, 8192);
  assert.equal(bufferSize(0, 0, 1).bufferWidth, 1);
  for (const value of [0, -1, NaN, Infinity])
    assert.throws(() => bufferSize(100, 100, value), /DPR/);
  assert.throws(() => bufferSize(-1, 100, 1), /尺寸/);
});
test("真实生命周期契约：容器、DPR-only、隐藏、拾取及重复销毁", () => {
  const f = fixture(),
    handle = mountScene(f.THREE, f.host, f.options);
  assert.deepEqual(f.calls.size, [800, 400]);
  assert.equal(f.calls.camera.aspect, 2);
  f.calls.loop(100);
  assert.equal(handle.status.frames, 1);
  f.view.devicePixelRatio = 2;
  f.calls.loop(200);
  assert.equal(f.canvas.width, 1600);
  const event = new Event("pointerdown");
  Object.assign(event, { clientX: 440, clientY: 280 });
  f.canvas.dispatchEvent(event);
  assert.deepEqual(f.calls.point, { x: 0, y: 0 });
  assert.equal(handle.status.selected, true);
  assert.equal(f.calls.color, 0xffb454);
  f.host.clientWidth = 1000;
  f.calls.resize();
  assert.equal(f.calls.camera.aspect, 2.5);
  f.host.clientWidth = 0;
  f.calls.resize();
  const renders = f.calls.renders;
  f.calls.loop(300);
  assert.equal(f.calls.renders, renders);
  handle.setPixelRatio(1);
  assert.equal(handle.status.pixelRatio, 1);
  const finalLoop = f.calls.loop;
  handle.destroy();
  handle.destroy();
  finalLoop(400);
  f.canvas.dispatchEvent(event);
  assert.equal(handle.status.picks, 1);
  assert.equal(handle.status.disposed, true);
  assert.equal(f.calls.loop, null);
  for (const key of ["geometry", "material", "renderer", "loss", "observer"])
    assert.equal(f.calls[key], 1, key);
  assert.equal(f.calls.removed, true);
  assert.equal(f.calls.renders, renders);
});
test("初始化异常释放已分配资源；意外上下文丢失停止循环并通知", () => {
  const failed = fixture({ fail: true });
  assert.throws(() => mountScene(failed.THREE, failed.host, failed.options), /初始化失败/);
  for (const key of ["geometry", "material", "renderer", "loss"])
    assert.equal(failed.calls[key], 1);
  const f = fixture(),
    handle = mountScene(f.THREE, f.host, f.options);
  f.canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  assert.equal(handle.status.disposed, true);
  assert.equal(f.calls.errors.length, 1);
  assert.equal(f.calls.loop, null);
  handle.destroy();
  assert.equal(f.calls.renderer, 1);
});
