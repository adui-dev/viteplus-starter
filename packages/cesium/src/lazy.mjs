// The loader stays outside this module so importing the page does not import Cesium.
export function createLazyGlobe(host, { load, onState = () => {}, onError = () => {} }) {
  let disposed = false,
    viewer,
    pending;
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
  return {
    load() {
      if (disposed || viewer) return Promise.resolve();
      if (pending) return pending;
      state(true);
      pending = Promise.resolve()
        .then(load)
        .then((module) => {
          if (disposed) return;
          const created = module.createGlobe(host);
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
      observer.disconnect();
      if (viewer && !viewer.isDestroyed()) viewer.destroy();
      viewer = undefined;
      state(false);
    },
  };
}
