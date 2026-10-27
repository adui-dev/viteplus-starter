import assert from "node:assert/strict";
import test from "node:test";
import { calculateLayout, toDesignPoint } from "../src/core.mjs";
import { createScreenController } from "../src/controller.mjs";

test("contain 居中、cover 裁切、stretch 独立轴与 none 布局", () => {
  const contain = calculateLayout(1000, 1000, { designWidth: 1000, designHeight: 500 });
  assert.deepEqual([contain.scaleX, contain.scaleY, contain.left, contain.top], [1, 1, 0, 250]);
  const cover = calculateLayout(1000, 1000, {
    designWidth: 1000,
    designHeight: 500,
    mode: "cover",
  });
  assert.deepEqual([cover.scaleX, cover.left, cover.top], [2, -500, 0]);
  assert.deepEqual(cover.engine, { left: 0, top: 0, width: 1000, height: 1000 });
  const stretch = calculateLayout(1000, 1000, {
    designWidth: 1000,
    designHeight: 500,
    mode: "stretch",
  });
  assert.deepEqual([stretch.scaleX, stretch.scaleY], [1, 2]);
  const none = calculateLayout(500, 250, { designWidth: 1000, designHeight: 500, mode: "none" });
  assert.deepEqual([none.scaleX, none.scaleY, none.left, none.top], [1, 1, 0, 0]);
});
test("禁放大、设计单位内缩与极端/隐藏容器不产生负视口或无穷比例", () => {
  const small = calculateLayout(4000, 2000, { allowUpscale: false, mode: "stretch" });
  assert.equal(small.scaleX, 1);
  assert.equal(small.scaleY, 1);
  const layout = calculateLayout(960, 540, { engineInsets: { top: 75, right: 1 } });
  assert.deepEqual(layout.engine, { left: 0, top: 37.5, width: 959.5, height: 502.5 });
  const empty = calculateLayout(100, 100, { engineInsets: { top: 10000, left: 10000 } });
  assert.equal(empty.engine.width, 0);
  assert.equal(empty.engine.height, 0);
  const hidden = calculateLayout(0, 0);
  assert.equal(hidden.visible, false);
  assert.equal(hidden.engine.width, 0);
  assert.equal(toDesignPoint(hidden, 0, 0), null);
  for (const options of [
    { designWidth: 0 },
    { designHeight: NaN },
    { mode: "fit" },
    { allowUpscale: 0 },
    { engineInsets: { top: -1 } },
  ])
    assert.throws(() => calculateLayout(100, 100, options));
  assert.throws(() => calculateLayout(-1, 100));
});
test("坐标反算正确处理留白、cover 负偏移与非等比缩放", () => {
  const contain = calculateLayout(1000, 1000, { designWidth: 1000, designHeight: 500 });
  assert.deepEqual(toDesignPoint(contain, 500, 500), { x: 500, y: 250, inside: true });
  assert.equal(toDesignPoint(contain, 500, 100).inside, false);
  const stretch = calculateLayout(1000, 1000, {
    designWidth: 1000,
    designHeight: 500,
    mode: "stretch",
  });
  assert.deepEqual(toDesignPoint(stretch, 250, 500), { x: 250, y: 250, inside: true });
  const cover = calculateLayout(1000, 1000, {
    designWidth: 1000,
    designHeight: 500,
    mode: "cover",
  });
  assert.deepEqual(toDesignPoint(cover, 0, 0), { x: 250, y: 0, inside: true });
});

function fixture() {
  const frames = new Map(),
    events = new Map();
  let observer,
    next = 0,
    disconnects = 0;
  const view = {
    requestAnimationFrame(fn) {
      frames.set(++next, fn);
      return next;
    },
    cancelAnimationFrame(id) {
      frames.delete(id);
    },
    addEventListener(name, fn) {
      events.set("window:" + name, fn);
    },
    removeEventListener(name) {
      events.delete("window:" + name);
    },
    ResizeObserver: class {
      constructor(fn) {
        this.notify = fn;
        observer = this;
      }
      observe() {}
      disconnect() {
        disconnects++;
      }
    },
  };
  const document = {
    defaultView: view,
    addEventListener(name, fn) {
      events.set(name, fn);
    },
    removeEventListener(name) {
      events.delete(name);
    },
    fullscreenElement: null,
    exitFullscreen: async () => {
      document.fullscreenElement = null;
    },
  };
  const shell = {
    ownerDocument: document,
    clientWidth: 1000,
    clientHeight: 1000,
    clientLeft: 2,
    clientTop: 3,
    getBoundingClientRect: () => ({ left: 100, top: 200 }),
    requestFullscreen: async () => {
      document.fullscreenElement = shell;
    },
  };
  const hud = { style: {} },
    engine = { style: {} };
  return {
    shell,
    hud,
    engine,
    document,
    frames,
    events,
    view,
    get observer() {
      return observer;
    },
    get disconnects() {
      return disconnects;
    },
    flush() {
      const queued = [...frames.values()];
      frames.clear();
      queued.forEach((fn) => fn());
    },
  };
}
test("DOM 控制器不变换引擎，容器/窗口/全屏事件合帧；销毁清除全部资源", async () => {
  const f = fixture();
  let updates = 0;
  const controller = createScreenController(
    f,
    { designWidth: 1000, designHeight: 500 },
    () => updates++,
  );
  assert.equal(f.engine.style.transform, "none");
  assert.equal(f.hud.style.top, "250px");
  assert.deepEqual(controller.clientToDesign(602, 703), { x: 500, y: 250, inside: true });
  f.observer.notify();
  f.events.get("window:resize")();
  f.events.get("fullscreenchange")();
  assert.equal(f.frames.size, 1);
  f.flush();
  assert.equal(updates, 2);
  controller.update({ mode: "stretch" });
  assert.equal(f.hud.style.transform, "scale(1, 2)");
  await controller.requestFullscreen();
  assert.equal(f.document.fullscreenElement, f.shell);
  await controller.exitFullscreen();
  assert.equal(f.document.fullscreenElement, null);
  f.observer.notify();
  controller.destroy();
  controller.destroy();
  assert.equal(f.frames.size, 0);
  assert.equal(f.events.size, 0);
  assert.equal(f.disconnects, 1);
  controller.refresh();
  controller.update({ designWidth: 0 });
  f.observer.notify();
  assert.equal(f.frames.size, 0);
  assert.equal(controller.clientToDesign(0, 0), null);
});
test("无 ResizeObserver 时窗口降级有效，全屏失败通过 Promise 返回", async () => {
  const f = fixture();
  delete f.view.ResizeObserver;
  delete f.shell.requestFullscreen;
  const controller = createScreenController(f);
  await assert.rejects(controller.requestFullscreen(), /不可用/);
  f.shell.clientWidth = 0;
  f.events.get("window:resize")();
  f.flush();
  assert.equal(f.hud.style.visibility, "hidden");
  controller.destroy();
});
