import { viewportRatio } from "../../screen/src/viewport.mjs";

export function resizeScene(engine, canvas) {
  const ratio = viewportRatio(
    canvas.clientWidth,
    canvas.clientHeight,
    canvas.ownerDocument.defaultView.devicePixelRatio || 1,
    Math.min(8192, engine.getCaps().maxTextureSize),
  );
  if (!ratio) return;
  const level = 1 / ratio;
  if (engine.getHardwareScalingLevel() !== level) engine.setHardwareScalingLevel(level);
  engine.resize();
}
