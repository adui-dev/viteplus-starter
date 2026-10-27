import { calculateLayout, normalizeOptions, toDesignPoint } from "./core.mjs";

export function createScreenController(elements, initialOptions = {}, onLayout = () => {}) {
  const { shell, hud, engine } = elements;
  if (!shell || !hud || !engine) throw new Error("大屏控制器需要 shell、hud、engine 元素");
  const document = shell.ownerDocument;
  const view = document.defaultView;
  if (!view) throw new Error("大屏控制器只能在已挂载的浏览器元素中创建");
  let options = normalizeOptions(initialOptions);
  let layout = null;
  let frame = null;
  let destroyed = false;
  const refresh = () => {
    if (destroyed) return;
    layout = calculateLayout(shell.clientWidth, shell.clientHeight, options);
    Object.assign(hud.style, {
      width: options.designWidth + "px",
      height: options.designHeight + "px",
      left: layout.left + "px",
      top: layout.top + "px",
      transform: `scale(${layout.scaleX}, ${layout.scaleY})`,
      visibility: layout.visible ? "visible" : "hidden",
    });
    Object.assign(engine.style, {
      left: layout.engine.left + "px",
      top: layout.engine.top + "px",
      width: layout.engine.width + "px",
      height: layout.engine.height + "px",
      transform: "none",
    });
    onLayout(layout);
  };
  const schedule = () => {
    if (!destroyed && frame === null)
      frame = view.requestAnimationFrame(() => {
        frame = null;
        refresh();
      });
  };
  const observer = view.ResizeObserver ? new view.ResizeObserver(schedule) : null;
  observer?.observe(shell);
  view.addEventListener("resize", schedule);
  document.addEventListener("fullscreenchange", schedule);
  refresh();
  return {
    get layout() {
      return layout;
    },
    refresh,
    update(input) {
      if (!destroyed) {
        options = normalizeOptions({ ...options, ...input });
        refresh();
      }
    },
    clientToDesign(clientX, clientY) {
      if (destroyed || !layout) return null;
      const rect = shell.getBoundingClientRect();
      return toDesignPoint(
        layout,
        clientX - rect.left - shell.clientLeft,
        clientY - rect.top - shell.clientTop,
      );
    },
    requestFullscreen() {
      if (destroyed || !shell.requestFullscreen)
        return Promise.reject(new Error("Fullscreen API 不可用"));
      return shell.requestFullscreen();
    },
    exitFullscreen() {
      if (destroyed || document.fullscreenElement !== shell) return Promise.resolve();
      return document.exitFullscreen();
    },
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      view.removeEventListener("resize", schedule);
      document.removeEventListener("fullscreenchange", schedule);
      if (frame !== null) view.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
