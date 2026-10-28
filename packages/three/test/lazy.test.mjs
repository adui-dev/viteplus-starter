import { test } from "node:test";
import assert from "node:assert/strict";
import { encryptAdui } from "../../model-security/src/adui.mjs";
import { createLazyScene } from "../src/lazy.mjs";

test("加密加载：晚到授权、替换、清除、取消及卸载不向引擎提交旧明文", async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const encrypt = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(64).fill(7).buffer;
  const buffer = await encryptAdui(plain, encrypt, {
    modelId: "test",
    keyId: "test-key",
    format: "glb",
  });
  const grant = () => ({ key, expiresAt: Date.now() + 10000 });
  for (const action of ["new", "plain", "clear", "abort", "destroy"]) {
    const loaded = [],
      errors = [];
    let resolve;
    const lazy = createLazyScene({}, { onError: (error) => errors.push(error) }, async () => ({
      createThreeScene: () => ({
        loadModel: async (value) => {
          loaded.push(value.slice(0));
          return true;
        },
        clearModel() {},
        cancelModelLoad() {},
        destroy() {},
      }),
    }));
    const abort = new AbortController();
    const pending = lazy.loadEncryptedModel(buffer, {
      signal: abort.signal,
      authorize: () =>
        new Promise((r) => {
          resolve = r;
        }),
    });
    if (action === "new")
      assert.equal(await lazy.loadEncryptedModel(buffer, { authorize: async () => grant() }), true);
    if (action === "plain") assert.equal(await lazy.loadModel(plain), true);
    if (action === "clear") lazy.clearModel();
    if (action === "abort") abort.abort();
    if (action === "destroy") lazy.destroy();
    resolve(grant());
    assert.equal(await pending, false);
    assert.equal(loaded.length, ["new", "plain"].includes(action) ? 1 : 0);
    assert.equal(errors.length, 0);
    lazy.destroy();
  }
});
test("解密失败保留当前场景，成功后清零临时明文且可重试", async () => {
  const raw = crypto.getRandomValues(new Uint8Array(32));
  const encrypt = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["encrypt"]);
  const key = await crypto.subtle.importKey("raw", raw, "AES-GCM", false, ["decrypt"]);
  const plain = new Uint8Array(64).fill(42).buffer;
  const buffer = await encryptAdui(plain, encrypt, {
    modelId: "test",
    keyId: "key",
    format: "glb",
  });
  let submitted,
    clears = 0,
    errors = 0;
  const lazy = createLazyScene({}, { onError: () => errors++ }, async () => ({
    createThreeScene: () => ({
      loadModel: async (value) => {
        assert.deepEqual(value, plain);
        submitted = value;
        return true;
      },
      clearModel() {
        clears++;
      },
      cancelModelLoad() {},
      destroy() {},
    }),
  }));
  await lazy.start();
  assert.equal(
    await lazy.loadEncryptedModel(buffer, {
      authorize: async () => {
        throw new Error("拒绝");
      },
    }),
    false,
  );
  assert.equal(clears, 0);
  assert.equal(errors, 1);
  assert.equal(
    await lazy.loadEncryptedModel(buffer, {
      authorize: async () => ({ key, expiresAt: Date.now() + 10000 }),
    }),
    true,
  );
  assert.ok(new Uint8Array(submitted).every((value) => value === 0));
  lazy.destroy();
});
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
