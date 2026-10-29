import { validateGlb } from "../../model-security/src/glb.mjs";
import { decryptAdui } from "../../model-security/src/adui.mjs";
export function createModelController({ parse, prepare = () => {}, onState = () => {} }) {
  let version = 0,
    disposed = false,
    current,
    abort;
  function invalidate() {
    version++;
    abort?.abort();
    abort = undefined;
  }
  function release(asset) {
    asset?.removeAllFromScene();
    asset?.dispose();
  }
  return {
    async load(buffer, { encrypted = false, authorize } = {}) {
      invalidate();
      if (disposed) return false;
      const request = version,
        signal = (abort = new AbortController()).signal;
      let plain, asset;
      try {
        // Snapshot before any authorization/loader await.
        if (!(buffer instanceof ArrayBuffer) || buffer.byteLength > 32 * 1024 * 1024 + 4112)
          throw new Error("模型大小或类型无效");
        const snapshot = buffer.slice(0);
        plain = encrypted ? await decryptAdui(snapshot, { authorize, signal }) : snapshot;
        if (disposed || request !== version) return false;
        const document = validateGlb(plain);
        for (const extension of [
          ...(document.extensionsUsed ?? []),
          ...(document.extensionsRequired ?? []),
        ])
          if (
            !extension.startsWith("KHR_materials_") &&
            ![
              "KHR_texture_transform",
              "KHR_lights_punctual",
              "KHR_mesh_quantization",
              "EXT_mesh_gpu_instancing",
            ].includes(extension)
          )
            throw new Error("未支持的 GLB 扩展：" + extension);
        onState("loading", "");
        // Loaders may retain typed-array views. Their owned copy lives with the asset.
        asset = await parse(plain.slice(0));
        if (disposed || request !== version) {
          release(asset);
          asset = undefined;
          return false;
        }
        prepare(asset);
        asset.addAllToScene();
        if (disposed || request !== version) {
          release(asset);
          asset = undefined;
          return false;
        }
        release(current);
        current = asset;
        asset = undefined;
        onState("ready", "");
        return true;
      } catch (error) {
        if (asset) release(asset);
        if (!disposed && request === version) onState("error", String(error));
        return false;
      } finally {
        if (plain) new Uint8Array(plain).fill(0);
      }
    },
    cancel() {
      invalidate();
    },
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
