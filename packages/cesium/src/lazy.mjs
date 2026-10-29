// Importing the page does not import Cesium; initialization stays behind load().
import { fetchBundledAdui } from "../../model-security/src/bundled.mjs";
export function createLazyGlobe(
  host,
  {
    load = () => {
      Reflect.set(
        globalThis,
        "CESIUM_BASE_URL",
        new URL("adui-cesium/", new URL(import.meta.env.BASE_URL, document.baseURI)).href,
      );
      return import("./scene.mjs");
    },
    onState = () => {},
    onError = () => {},
    onModelState = () => {},
  } = {},
) {
  let disposed = false,
    viewer,
    pending,
    modelVersion = 0,
    modelAbort;
  function invalidate() {
    ++modelVersion;
    modelAbort?.abort();
    modelAbort = undefined;
    viewer?.cancelModelLoad?.();
  }
  const observer = new ResizeObserver(() => {
    if (viewer && !viewer.isDestroyed()) {
      viewer.resize();
      viewer.scene.requestRender();
    }
  });
  observer.observe(host);
  function state(loading) {
    onState({ loading, ready: Boolean(viewer), disposed });
  }
  const handle = {
    async loadModel(buffer, options) {
      invalidate();
      if (!viewer || disposed) throw new Error("请先加载 Cesium 场景");
      return viewer.loadModel(buffer, options);
    },
    clearModel() {
      invalidate();
      viewer?.clearModel?.();
    },
    cancelModelLoad() {
      invalidate();
    },
    async loadBundledModel(asset, options = {}) {
      if (disposed) return false;
      invalidate();
      const request = modelVersion,
        abort = new AbortController();
      modelAbort = abort;
      const cancel = () => {
        if (request === modelVersion) invalidate();
      };
      options.signal?.addEventListener("abort", cancel, { once: true });
      if (options.signal?.aborted) cancel();
      try {
        const buffer = await fetchBundledAdui(asset, { signal: abort.signal });
        if (disposed || request !== modelVersion || abort.signal.aborted) return false;
        await handle.load();
        if (disposed || request !== modelVersion || abort.signal.aborted || !viewer) return false;
        return await viewer.loadModel(buffer, { encrypted: true, authorize: options.authorize });
      } catch (error) {
        if (!disposed && request === modelVersion && !abort.signal.aborted) onError(String(error));
        return false;
      } finally {
        options.signal?.removeEventListener("abort", cancel);
        if (modelAbort === abort) modelAbort = undefined;
      }
    },
    load() {
      if (disposed || viewer) return Promise.resolve();
      if (pending) return pending;
      state(true);
      pending = Promise.resolve()
        .then(load)
        .then((module) => {
          if (disposed) return;
          const created = module.createGlobe(host, (value) => {
            if (!disposed) {
              onModelState(value);
              if (value.state === "error") onError(value.message);
            }
          });
          if (disposed) {
            if (!created.isDestroyed()) created.destroy();
            return;
          }
          viewer = created;
          state(false);
        })
        .catch((error) => {
          if (!disposed) {
            state(false);
            onError(String(error));
          }
        })
        .finally(() => {
          pending = undefined;
        });
      return pending;
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      invalidate();
      observer.disconnect();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewer = undefined;
      state(false);
    },
  };
  return handle;
}
