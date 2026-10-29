// Engine canvases use CSS pixels; only their drawing buffers follow DPR.
export function viewportRatio(width, height, dpr = 1, maxDimension = 8192) {
  if (
    ![width, height, dpr, maxDimension].every(Number.isFinite) ||
    width <= 0 ||
    height <= 0 ||
    dpr <= 0 ||
    maxDimension <= 0
  )
    return 0;
  return Math.min(2, dpr, maxDimension / Math.max(width, height));
}

export function observeViewport(host, resize) {
  const document = host.ownerDocument;
  const window = document?.defaultView;
  let disposed = false,
    frame,
    lastRatio = window?.devicePixelRatio,
    media,
    removeMedia;
  const refresh = () => {
    if (!disposed) resize();
  };
  function watchRatio() {
    removeMedia?.();
    media = window?.matchMedia?.(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    if (!media) return;
    const changed = () => {
      if (!disposed) {
        lastRatio = window.devicePixelRatio;
        watchRatio();
        refresh();
      }
    };
    if (media.addEventListener) {
      media.addEventListener("change", changed);
      removeMedia = () => media.removeEventListener("change", changed);
    } else {
      media.addListener(changed);
      removeMedia = () => media.removeListener(changed);
    }
  }
  const Observer = window?.ResizeObserver ?? globalThis.ResizeObserver;
  const observer = Observer ? new Observer(refresh) : undefined;
  observer?.observe(host);
  window?.addEventListener("resize", refresh);
  document?.addEventListener?.("fullscreenchange", refresh);
  watchRatio();
  // Some browsers update DPR without emitting resize or MediaQueryList.change.
  // Check the scalar only; layout is measured by the engine on an actual change.
  function checkRatio() {
    if (disposed) return;
    if (window.devicePixelRatio !== lastRatio) {
      lastRatio = window.devicePixelRatio;
      watchRatio();
      refresh();
    }
    frame = window.requestAnimationFrame(checkRatio);
  }
  if (window?.requestAnimationFrame) frame = window.requestAnimationFrame(checkRatio);
  return () => {
    if (disposed) return;
    disposed = true;
    observer?.disconnect();
    removeMedia?.();
    if (frame !== undefined) window.cancelAnimationFrame(frame);
    window?.removeEventListener("resize", refresh);
    document?.removeEventListener?.("fullscreenchange", refresh);
  };
}
