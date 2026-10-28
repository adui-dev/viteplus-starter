export function createRuntime(
  canvas,
  { createEngine, createScene, initialize, onError = () => {} },
) {
  let engine,
    scene,
    disposed = false;
  function destroy() {
    if (disposed) return;
    disposed = true;
    try {
      engine?.stopRenderLoop(render);
    } finally {
      try {
        scene?.dispose();
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
    initialize(scene);
    engine.runRenderLoop(render);
    return {
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
