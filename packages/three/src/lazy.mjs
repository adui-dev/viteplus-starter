import { decryptAdui } from "../../model-security/src/adui.mjs";
export function createLazyScene(host, options = {}, loader = () => import("./index.mjs")) {
  const { onState = () => {}, ...settings } = options;
  let disposed = false,
    scene = null,
    pending = null,
    modelVersion = 0,
    modelAbort = null;
  function invalidate() {
    ++modelVersion;
    modelAbort?.abort();
    modelAbort = null;
    scene?.cancelModelLoad?.();
  }
  const handle = {
    start() {
      if (disposed || scene) return Promise.resolve();
      if (pending) return pending;
      onState({ loading: true, ready: false });
      pending = Promise.resolve()
        .then(loader)
        .then((module) => {
          if (disposed) return;
          const created = module.createThreeScene(host, settings);
          if (disposed) {
            created.destroy();
            return;
          }
          scene = created;
          onState({ loading: false, ready: true });
        })
        .catch((error) => {
          if (!disposed) {
            settings.onError?.(error instanceof Error ? error : new Error(String(error)));
            onState({ loading: false, ready: false });
          }
        })
        .finally(() => {
          pending = null;
        });
      return pending;
    },
    setPixelRatio(value) {
      settings.pixelRatio = value;
      if (!disposed) scene?.setPixelRatio(value);
    },
    cancelModelLoad: invalidate,
    async loadModel(buffer) {
      invalidate();
      const request = modelVersion;
      await handle.start();
      if (disposed || !scene || request !== modelVersion) return false;
      return scene.loadModel(buffer);
    },
    async loadEncryptedModel(buffer, options) {
      if (disposed) return false;
      invalidate();
      const request = modelVersion,
        abort = new AbortController();
      modelAbort = abort;
      const cancel = () => {
        abort.abort();
        if (request === modelVersion) scene?.cancelModelLoad?.();
      };
      options?.signal?.addEventListener("abort", cancel, { once: true });
      if (options?.signal?.aborted) cancel();
      let plain;
      try {
        plain = await decryptAdui(buffer, { authorize: options?.authorize, signal: abort.signal });
        if (disposed || request !== modelVersion || abort.signal.aborted) return false;
        await handle.start();
        if (disposed || request !== modelVersion || abort.signal.aborted || !scene) return false;
        return await scene.loadModel(plain);
      } catch (error) {
        if (!disposed && request === modelVersion && !abort.signal.aborted)
          settings.onError?.(error instanceof Error ? error : new Error(String(error)));
        return false;
      } finally {
        if (plain) new Uint8Array(plain).fill(0);
        options?.signal?.removeEventListener("abort", cancel);
        if (modelAbort === abort) modelAbort = null;
      }
    },
    clearModel() {
      invalidate();
      if (!disposed) scene?.clearModel();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      invalidate();
      scene?.destroy();
      scene = null;
    },
  };
  return handle;
}
