import { viewportRatio } from "../../screen/src/viewport.mjs";

export function resizeGlobe(viewer, host) {
  const dpr = host.ownerDocument.defaultView.devicePixelRatio || 1;
  const ratio = viewportRatio(host.clientWidth, host.clientHeight, dpr);
  if (!ratio || viewer.isDestroyed()) return;
  viewer.useBrowserRecommendedResolution = false;
  viewer.resolutionScale = ratio / dpr;
  viewer.resize();
  viewer.scene.requestRender();
}
