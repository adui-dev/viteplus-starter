import { test } from "node:test";
import assert from "node:assert/strict";
import { validateGlb, disposeGltf, createModelController, modelBounds } from "../src/model.mjs";
function buffer(json = { asset: { version: "2.0" } }) {
  const text = new TextEncoder().encode(JSON.stringify(json));
  const size = Math.ceil(text.length / 4) * 4;
  const result = new ArrayBuffer(20 + size),
    view = new DataView(result);
  for (const [offset, value] of [
    [0, 0x46546c67],
    [4, 2],
    [8, result.byteLength],
    [12, size],
    [16, 0x4e4f534a],
  ])
    view.setUint32(offset, value, true);
  const bytes = new Uint8Array(result);
  bytes.fill(32, 20);
  bytes.set(text, 20);
  return result;
}
function asset() {
  const calls = { geometry: 0, material: 0, texture: 0, image: 0, skeleton: 0 };
  const image = {
      close() {
        calls.image++;
      },
    },
    texture = {
      isTexture: true,
      source: { data: image },
      dispose() {
        calls.texture++;
      },
    };
  const node = {
    geometry: {
      dispose() {
        calls.geometry++;
      },
    },
    material: {
      map: texture,
      normalMap: texture,
      dispose() {
        calls.material++;
      },
    },
    skeleton: {
      dispose() {
        calls.skeleton++;
      },
    },
  };
  const scene = {
    traverse(fn) {
      fn(node);
      fn({ ...node });
    },
  };
  return { scene, scenes: [scene], calls };
}
test("GLB 文件头/分块、大小、外部资源与未配置压缩格式预检", () => {
  assert.equal(validateGlb(buffer()).asset.version, "2.0");
  for (const value of [
    null,
    new Uint8Array(24),
    new ArrayBuffer(10),
    new ArrayBuffer(33 * 1024 * 1024),
  ])
    assert.throws(() => validateGlb(value), /ArrayBuffer/);
  const broken = buffer();
  new DataView(broken).setUint32(8, 100, true);
  assert.throws(() => validateGlb(broken), /文件头或长度/);
  const truncated = buffer();
  new DataView(truncated).setUint32(12, 100000, true);
  assert.throws(() => validateGlb(truncated), /分块长度/);
  for (const json of [
    { asset: { version: "1.0" } },
    { asset: { version: "2.0" }, images: [{ uri: "https://example.com/a.jpg" }] },
    { asset: { version: "2.0" }, buffers: [{ uri: "file:///private.bin" }] },
    { asset: { version: "2.0" }, extensionsUsed: ["KHR_draco_mesh_compression"] },
  ])
    assert.throws(() => validateGlb(buffer(json)));
});
test("跨场景共享几何/材质/纹理/位图与骨架只释放一次", () => {
  const item = asset();
  assert.deepEqual(disposeGltf(item), {
    geometries: 1,
    materials: 1,
    textures: 1,
    images: 1,
    skeletons: 1,
  });
  assert.deepEqual(item.calls, { geometry: 1, material: 1, texture: 1, image: 1, skeleton: 1 });
});
test("后发请求优先；晚到/卸载后解析结果立即释放，不安装或通知失效组件", async () => {
  const pending = [],
    installed = [],
    states = [];
  const controller = createModelController({
    parse: () => new Promise((resolve) => pending.push(resolve)),
    install: (value) => installed.push(value),
    remove() {},
    onState: (state) => states.push(state),
  });
  const first = controller.load(buffer()),
    second = controller.load(buffer());
  const old = asset(),
    current = asset();
  pending[1](current);
  assert.equal(await second, true);
  pending[0](old);
  assert.equal(await first, false);
  assert.deepEqual(installed, [current]);
  assert.equal(old.calls.texture, 1);
  const third = controller.load(buffer());
  controller.destroy();
  const count = states.length;
  const late = asset();
  pending[2](late);
  assert.equal(await third, false);
  assert.equal(states.length, count);
  assert.equal(late.calls.image, 1);
  assert.equal(current.calls.texture, 1);
  controller.destroy();
  assert.equal(current.calls.texture, 1);
});
test("失败保留已有模型；替换/清除释放旧资产，安装失败移除新资产", async () => {
  let next = asset(),
    failure = false;
  const removed = [],
    errors = [];
  const controller = createModelController({
    parse: async () => next,
    install() {
      if (failure) throw new Error("安装失败");
    },
    remove: (value) => removed.push(value),
    onError: (error) => errors.push(error.message),
  });
  const original = next;
  assert.equal(await controller.load(buffer()), true);
  assert.equal(await controller.load(new ArrayBuffer(20)), false);
  assert.equal(original.calls.texture, 0);
  next = asset();
  failure = true;
  assert.equal(await controller.load(buffer()), false);
  assert.equal(next.calls.texture, 1);
  assert.ok(removed.includes(next));
  assert.equal(original.calls.texture, 0);
  failure = false;
  next = asset();
  assert.equal(await controller.load(buffer()), true);
  assert.equal(original.calls.texture, 1);
  controller.clear();
  assert.equal(next.calls.texture, 1);
  controller.destroy();
  assert.equal(next.calls.texture, 1);
  assert.equal(errors.length, 2);
});
test("安装过程中同步卸载仍清理新解析资产", async () => {
  const item = asset();
  let controller;
  controller = createModelController({
    parse: async () => item,
    install() {
      controller.destroy();
    },
    remove() {},
  });
  assert.equal(await controller.load(buffer()), false);
  assert.equal(item.calls.texture, 1);
});

test("归一化后的包围球覆盖模型并留出边距，拒绝空和非有限边界", () => {
  const size = { x: 2, y: 4, z: 3 },
    fit = modelBounds(size);
  assert.equal(fit.scale, 0.5);
  const actualRadius = (Math.hypot(size.x, size.y, size.z) * fit.scale) / 2;
  assert.ok(fit.radius > actualRadius);
  assert.ok(Number.isFinite(modelBounds({ x: 1e308, y: 1e308, z: 1e308 }).radius));
  for (const s of [
    { x: 0, y: 0, z: 0 },
    { x: NaN, y: 1, z: 1 },
    { x: 1, y: -1, z: 1 },
  ])
    assert.throws(() => modelBounds(s));
});
