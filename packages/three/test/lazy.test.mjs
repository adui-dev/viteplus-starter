import { test } from "node:test";
import assert from "node:assert/strict";
import { createLazyScene } from "../src/lazy.mjs";
test("不提前导入，重复加载共用请求；初始化使用加载期间更新的 DPR，清理幂等", async () => {
  let loads = 0,
    creates = 0,
    destroys = 0,
    resolve,
    settings;
  const states = [];
  const lazy = createLazyScene({}, { onState: (state) => states.push(state) }, () => {
    loads++;
    return new Promise((r) => {
      resolve = r;
    });
  });
  assert.equal(loads, 0);
  const first = lazy.start();
  assert.equal(first, lazy.start());
  await Promise.resolve();
  assert.equal(loads, 1);
  lazy.setPixelRatio(2);
  resolve({
    createThreeScene(_host, options) {
      creates++;
      settings = options;
      return {
        destroy() {
          destroys++;
        },
        setPixelRatio(value) {
          settings.pixelRatio = value;
        },
      };
    },
  });
  await first;
  assert.equal(creates, 1);
  assert.equal(settings.pixelRatio, 2);
  lazy.setPixelRatio(1);
  assert.equal(settings.pixelRatio, 1);
  await lazy.start();
  assert.equal(loads, 1);
  lazy.destroy();
  lazy.destroy();
  assert.equal(destroys, 1);
  assert.deepEqual(states, [
    { loading: true, ready: false },
    { loading: false, ready: true },
  ]);
});
test("异步导入未完成就销毁，不创建 WebGL 或回调已卸载组件", async () => {
  let resolve,
    creates = 0;
  const states = [];
  const lazy = createLazyScene(
    {},
    { onState: (value) => states.push(value) },
    () =>
      new Promise((r) => {
        resolve = r;
      }),
  );
  const promise = lazy.start();
  await Promise.resolve();
  lazy.destroy();
  resolve({
    createThreeScene() {
      creates++;
    },
  });
  await promise;
  assert.equal(creates, 0);
  assert.equal(states.length, 1);
  await lazy.start();
  assert.equal(states.length, 1);
});
test("失败通知并可重试；销毁后加载失败不再通知", async () => {
  let attempts = 0,
    errors = 0,
    destroys = 0;
  const lazy = createLazyScene({}, { onError: () => errors++ }, async () => {
    if (++attempts === 1) throw new Error("网络故障");
    return {
      createThreeScene: () => ({
        destroy() {
          destroys++;
        },
      }),
    };
  });
  await lazy.start();
  assert.equal(errors, 1);
  await lazy.start();
  assert.equal(attempts, 2);
  lazy.destroy();
  assert.equal(destroys, 1);
  let reject;
  const cancelled = createLazyScene(
    {},
    { onError: () => errors++ },
    () =>
      new Promise((_resolve, r) => {
        reject = r;
      }),
  );
  const pending = cancelled.start();
  await Promise.resolve();
  cancelled.destroy();
  reject(new Error("晚到错误"));
  await pending;
  assert.equal(errors, 1);
});

test("初始化回调同步触发卸载时仍释放刚创建的实例", async () => {
  let destroyed = 0,
    lazy;
  lazy = createLazyScene({}, {}, async () => ({
    createThreeScene() {
      lazy.destroy();
      return {
        destroy() {
          destroyed++;
        },
      };
    },
  }));
  await lazy.start();
  assert.equal(destroyed, 1);
  lazy.destroy();
  assert.equal(destroyed, 1);
});
