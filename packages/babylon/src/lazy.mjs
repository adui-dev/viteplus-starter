export function createLazyScene(host, { load, onState = () => {}, onError = () => {} }) {
  let disposed = false,
    scene,
    pending,
    canvas;
  const observer = new ResizeObserver(() => scene?.resize());
  observer.observe(host);
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
    clear();
    if (!disposed) {
      state(false);
      onError(String(message));
    }
  }
  return {
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
          const created = module.createScene(canvas, (message) => {
            if (initializing) failure = message;
            else failed(message);
          });
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
      observer.disconnect();
      clear();
      state(false);
    },
  };
}
