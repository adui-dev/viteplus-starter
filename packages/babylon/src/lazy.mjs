import { observeViewport } from "../../screen/src/viewport.mjs";
import { fetchBundledAdui } from "../../model-security/src/bundled.mjs";
export function createLazyScene(
  host,
  {
    load = () => import("./scene.mjs"),
    onState = () => {},
    onError = () => {},
    onModelState = () => {},
  } = {},
) {
  let disposed = false,
    scene,
    pending,
    canvas,
    modelVersion = 0,
    modelAbort;
  function invalidate() {
    ++modelVersion;
    modelAbort?.abort();
    modelAbort = undefined;
    scene?.cancelModelLoad?.();
  }
  const stopObserving = observeViewport(host, () => {
    scene?.resize();
  });
  function state(loading) {
    onState({ loading, ready: Boolean(scene), disposed });
  }
  function clear() {
    try {
      scene?.destroy();
    } finally {
      scene = undefined;
      canvas?.remove();
      canvas = undefined;
    }
  }
  function failed(message) {
    invalidate();
    clear();
    if (!disposed) {
      state(false);
      onError(String(message));
    }
  }
  const handle = {
    async loadModel(buffer, options) {
      invalidate();
      if (!scene || disposed) throw new Error("请先加载 Babylon 场景");
      return scene.loadModel(buffer, options);
    },
    clearModel() {
      invalidate();
      scene?.clearModel?.();
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
        if (disposed || request !== modelVersion || abort.signal.aborted || !scene) return false;
        return await scene.loadModel(buffer, { encrypted: true, authorize: options.authorize });
      } catch (error) {
        if (!disposed && request === modelVersion && !abort.signal.aborted) onError(String(error));
        return false;
      } finally {
        options.signal?.removeEventListener("abort", cancel);
        if (modelAbort === abort) modelAbort = undefined;
      }
    },
    load() {
      if (disposed || scene) return Promise.resolve();
      if (pending) return pending;
      state(true);
      pending = Promise.resolve()
        .then(load)
        .then((module) => {
          if (disposed) return;
          canvas = host.ownerDocument.createElement("canvas");
          canvas.className = "babylon-canvas";
          canvas.setAttribute("aria-label", "Babylon 立方体");
          host.append(canvas);
          let initializing = true,
            failure;
          const created = module.createScene(
            canvas,
            (message) => {
              if (initializing) failure = message;
              else failed(message);
            },
            (value) => {
              if (!disposed) {
                onModelState(value);
                if (value.state === "error") onError(value.message);
              }
            },
          );
          initializing = false;
          if (failure) {
            created.destroy();
            throw new Error(failure);
          }
          if (disposed) {
            created.destroy();
            canvas?.remove();
            canvas = undefined;
            return;
          }
          scene = created;
          state(false);
        })
        .catch((error) => {
          if (!disposed) failed(error);
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
      stopObserving();
      clear();
      state(false);
    },
  };
  return handle;
}
