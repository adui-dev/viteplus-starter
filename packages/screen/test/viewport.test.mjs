import { test } from "node:test";
import assert from "node:assert/strict";
import { observeViewport, viewportRatio } from "../src/viewport.mjs";
import { resizeScene } from "../../babylon/src/resolution.mjs";
import { resizeGlobe } from "../../cesium/src/resolution.mjs";

test("绘图比例限制 DPR 和最长边，隐藏或无效尺寸不分配缓冲区", () => {
  assert.equal(viewportRatio(1000, 700, 1.25), 1.25);
  assert.equal(viewportRatio(1000, 700, 4), 2);
  assert.equal(viewportRatio(10000, 2000, 2), 8192 / 10000);
  for (const values of [
    [0, 700, 2],
    [-1, 700, 2],
    [100, 100, NaN],
    [100, 100, 0],
  ])
    assert.equal(viewportRatio(...values), 0);
});

test("DPR 单独变化重新订阅，窗口/全屏/容器更新，销毁后不再通知", () => {
  const window = new EventTarget(),
    document = new EventTarget(),
    media = [];
  let observed,
    disconnected = 0,
    resized = 0;
  window.devicePixelRatio = 1;
  window.matchMedia = (query) => {
    const value = new EventTarget();
    value.query = query;
    media.push(value);
    return value;
  };
  window.ResizeObserver = class {
    constructor(callback) {
      observed = callback;
    }
    observe() {}
    disconnect() {
      disconnected++;
    }
  };
  document.defaultView = window;
  const stop = observeViewport({ ownerDocument: document }, () => resized++);
  observed();
  window.dispatchEvent(new Event("resize"));
  document.dispatchEvent(new Event("fullscreenchange"));
  assert.equal(resized, 3);
  window.devicePixelRatio = 2;
  media[0].dispatchEvent(new Event("change"));
  assert.equal(resized, 4);
  assert.equal(media[1].query, "(resolution: 2dppx)");
  media[0].dispatchEvent(new Event("change"));
  assert.equal(resized, 4);
  stop();
  stop();
  observed();
  media[1].dispatchEvent(new Event("change"));
  window.dispatchEvent(new Event("resize"));
  document.dispatchEvent(new Event("fullscreenchange"));
  assert.equal(resized, 4);
  assert.equal(disconnected, 1);
});

test("Babylon 用逆 DPR 设置硬件缩放，Cesium 用原生 DPR 的补偿比例", () => {
  const host = {
    clientWidth: 1000,
    clientHeight: 700,
    ownerDocument: { defaultView: { devicePixelRatio: 3 } },
  };
  let level = 1,
    resized = 0,
    rendered = 0;
  const engine = {
    getCaps: () => ({ maxTextureSize: 4096 }),
    getHardwareScalingLevel: () => level,
    setHardwareScalingLevel: (value) => {
      level = value;
    },
    resize: () => resized++,
  };
  resizeScene(engine, host);
  assert.equal(level, 0.5);
  assert.equal(resized, 1);
  host.clientWidth = 8192;
  resizeScene(engine, host);
  assert.equal(level, 2);
  const viewer = {
    isDestroyed: () => false,
    resize: () => resized++,
    scene: { requestRender: () => rendered++ },
  };
  resizeGlobe(viewer, host);
  assert.equal(viewer.useBrowserRecommendedResolution, false);
  assert.equal(viewer.resolutionScale, 1 / 3);
  assert.equal(rendered, 1);
  host.clientWidth = 0;
  resizeScene(engine, host);
  resizeGlobe(viewer, host);
  assert.equal(resized, 3);
  assert.equal(rendered, 1);
  host.clientWidth = 1000;
  viewer.isDestroyed = () => true;
  resizeGlobe(viewer, host);
  assert.equal(resized, 3);
});

test("无窗口或媒体查询事件的 DPR 变化仍刷新，逐帧兜底在卸载时取消", () => {
  let tick,
    stale,
    frame = 0,
    cancelled,
    resized = 0;
  const window = new EventTarget();
  window.devicePixelRatio = 1;
  window.requestAnimationFrame = (callback) => {
    tick = callback;
    return ++frame;
  };
  window.cancelAnimationFrame = (id) => {
    cancelled = id;
  };
  const document = new EventTarget();
  document.defaultView = window;
  const stop = observeViewport({ ownerDocument: document }, () => resized++);
  tick();
  assert.equal(resized, 0);
  window.devicePixelRatio = 2;
  tick();
  assert.equal(resized, 1);
  tick();
  assert.equal(resized, 1);
  stale = tick;
  stop();
  assert.equal(cancelled, frame);
  window.devicePixelRatio = 3;
  stale();
  assert.equal(resized, 1);
});
