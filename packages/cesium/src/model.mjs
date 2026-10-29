import { validateGlb } from "../../model-security/src/glb.mjs";
import { decryptAdui } from "../../model-security/src/adui.mjs";

export function waitModelReady(model, { signal, requestRender, afterRender, timeoutMs = 30000 }) {
  signal.throwIfAborted();
  if (model.ready) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const removers = [];
    let timer,
      finished = false;
    function finish(error) {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      for (const remove of removers) remove();
      signal.removeEventListener("abort", cancel);
      if (error) reject(error);
      else resolve();
    }
    const cancel = () => finish(signal.reason ?? new Error("模型加载已取消"));
    const render = () => {
      try {
        requestRender();
      } catch (error) {
        finish(error);
      }
    };
    try {
      removers.push(model.readyEvent.addEventListener(() => finish()));
      removers.push(
        model.errorEvent.addEventListener((error) =>
          finish(error instanceof Error ? error : new Error(String(error))),
        ),
      );
      removers.push(afterRender(render));
      signal.addEventListener("abort", cancel, { once: true });
      timer = setTimeout(() => finish(new Error("模型资源就绪超时")), timeoutMs);
      render();
    } catch (error) {
      finish(error);
    }
  });
}

export function createModelController({
  create,
  add,
  remove,
  ready,
  prepare = () => {},
  onState = () => {},
  makeUrl = (buffer) => URL.createObjectURL(new Blob([buffer], { type: "model/gltf-binary" })),
  revokeUrl = (url) => URL.revokeObjectURL(url),
}) {
  let version = 0,
    disposed = false,
    current,
    candidate,
    abort;
  function release(asset) {
    if (!asset || asset.released) return;
    asset.released = true;
    try {
      try {
        remove(asset.model);
      } finally {
        if (!asset.model.isDestroyed()) asset.model.destroy();
      }
    } finally {
      revokeUrl(asset.url);
    }
  }
  function invalidate() {
    ++version;
    abort?.abort();
    abort = undefined;
    release(candidate);
    candidate = undefined;
  }
  return {
    async load(buffer, { encrypted = false, authorize } = {}) {
      invalidate();
      if (disposed) return false;
      const request = version,
        signal = (abort = new AbortController()).signal;
      let plain, url, asset;
      try {
        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > 32 * 1024 * 1024 + 4112)
          throw new Error("模型大小或类型无效");
        const snapshot = buffer.slice(0);
        plain = encrypted ? await decryptAdui(snapshot, { authorize, signal }) : snapshot;
        if (disposed || request !== version) return false;
        const document = validateGlb(plain);
        const supported = [
          "KHR_materials_unlit",
          "KHR_materials_pbrSpecularGlossiness",
          "KHR_materials_specular",
          "KHR_materials_clearcoat",
          "KHR_materials_anisotropy",
          "KHR_texture_transform",
          "KHR_mesh_quantization",
          "EXT_mesh_gpu_instancing",
        ];
        for (const extension of [
          ...(document.extensionsUsed ?? []),
          ...(document.extensionsRequired ?? []),
        ])
          if (!supported.includes(extension)) throw new Error("未支持的 GLB 扩展：" + extension);
        // Inspect actual extension maps too; malformed files may omit declarations.
        const objects = [document];
        while (objects.length) {
          const value = objects.pop();
          if (!value || typeof value !== "object") continue;
          for (const extension of Object.keys(value.extensions ?? {}))
            if (!supported.includes(extension)) throw new Error("未支持的 GLB 扩展：" + extension);
          for (const [key, child] of Object.entries(value))
            if (key !== "extras" && child && typeof child === "object") objects.push(child);
        }
        onState("loading", "");
        url = makeUrl(plain);
        const model = await create(url);
        asset = { model, url };
        url = undefined;
        if (disposed || request !== version) {
          release(asset);
          return false;
        }
        candidate = asset;
        model.show = false;
        add(model);
        await ready(model, signal);
        if (disposed || request !== version) {
          release(asset);
          return false;
        }
        prepare(model);
        if (disposed || request !== version) {
          release(asset);
          return false;
        }
        model.show = true;
        release(current);
        current = asset;
        candidate = undefined;
        asset = undefined;
        onState("ready", "");
        return true;
      } catch (error) {
        release(asset);
        if (!disposed && request === version) onState("error", String(error));
        return false;
      } finally {
        if (candidate === asset) candidate = undefined;
        if (url) revokeUrl(url);
        if (plain) new Uint8Array(plain).fill(0);
      }
    },
    cancel: invalidate,
    clear() {
      invalidate();
      release(current);
      current = undefined;
      if (!disposed) onState("empty", "");
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      invalidate();
      release(current);
      current = undefined;
    },
  };
}
