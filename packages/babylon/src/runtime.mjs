export function createRuntime(
  canvas,
  { createEngine, createScene, initialize, onError = () => {} },
) {
  let engine,
    scene,
    extension,
    disposed = false;
  function destroy() {
    if (disposed) return;
    disposed = true;
    try {
      engine?.stopRenderLoop(render);
    } finally {
      try {
        try {
          extension?.destroy?.();
        } finally {
          scene?.dispose();
        }
      } finally {
        engine?.dispose();
      }
    }
  }
  function render() {
    if (disposed) return;
    try {
      scene.render();
    } catch (error) {
      destroy();
      onError(String(error));
    }
  }
  try {
    engine = createEngine(canvas);
    scene = createScene(engine);
    extension = initialize(scene);
    engine.runRenderLoop(render);
    return {
      ...extension,
      resize() {
        if (!disposed) engine.resize();
      },
      destroy,
    };
  } catch (error) {
    destroy();
    throw error;
  }
}
