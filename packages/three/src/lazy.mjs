export function createLazyScene(host, options = {}, loader = () => import("./index.mjs")) {
  const { onState = () => {}, ...settings } = options;
  let disposed = false,
    scene = null,
    pending = null;
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
    async loadModel(buffer) {
      await handle.start();
      if (disposed || !scene) return false;
      return scene.loadModel(buffer);
    },
    clearModel() {
      if (!disposed) scene?.clearModel();
    },
    destroy() {
      if (disposed) return;
      disposed = true;
      scene?.destroy();
      scene = null;
    },
  };
  return handle;
}
