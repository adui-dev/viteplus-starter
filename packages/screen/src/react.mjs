import {
  createContext,
  createElement,
  forwardRef,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { createScreenController } from "./controller.mjs";
import "./style.css";

const ScreenContext = createContext(null);
export function useAdScreen() {
  const context = useContext(ScreenContext);
  if (!context) throw new Error("useAdScreen 必须在 AdScreen 内使用");
  return context;
}
const slot = (content, context) => (typeof content === "function" ? content(context) : content);
export const AdScreen = forwardRef(function AdScreen(
  {
    designWidth = 1920,
    designHeight = 1080,
    mode = "contain",
    allowUpscale = true,
    engineInsets,
    engine,
    hud,
    children,
    overlayScaled,
    overlayUnscaled,
    onLayout,
    className = "",
    style,
  },
  ref,
) {
  const [shell, setShell] = useState(null);
  const [hudElement, setHudElement] = useState(null);
  const [engineElement, setEngineElement] = useState(null);
  const [scaledRoot, setScaledRoot] = useState(null);
  const [unscaledRoot, setUnscaledRoot] = useState(null);
  const controller = useRef(null);
  const [activeController, setActiveController] = useState(null);
  const latest = useRef(null);
  useEffect(() => {
    latest.current = {
      options: { designWidth, designHeight, mode, allowUpscale, engineInsets },
      onLayout,
    };
  });
  const [layout, setLayout] = useState(null);
  useEffect(() => {
    if (!shell || !hudElement || !engineElement) return;
    controller.current = createScreenController(
      { shell, hud: hudElement, engine: engineElement },
      latest.current.options,
      (next) => {
        setLayout(next);
        latest.current.onLayout?.(next);
      },
    );
    setActiveController(controller.current);
    return () => {
      controller.current?.destroy();
      controller.current = null;
    };
  }, [shell, hudElement, engineElement]);
  const insetKey = JSON.stringify(engineInsets ?? {});
  useEffect(() => {
    controller.current?.update(latest.current.options);
  }, [designWidth, designHeight, mode, allowUpscale, insetKey]);
  const context = {
    layout,
    scaledRoot,
    unscaledRoot,
    refresh: () => activeController?.refresh(),
    clientToDesign: (x, y) => activeController?.clientToDesign(x, y) ?? null,
    requestFullscreen: () =>
      activeController
        ? activeController.requestFullscreen()
        : Promise.reject(new Error("AdScreen 尚未挂载")),
    exitFullscreen: () => activeController?.exitFullscreen() ?? Promise.resolve(),
  };
  useImperativeHandle(ref, () => context);
  return createElement(
    ScreenContext.Provider,
    { value: context },
    createElement(
      "section",
      { className: "ad-screen " + className, style, ref: setShell },
      createElement(
        "div",
        { className: "ad-screen__engine", ref: setEngineElement },
        slot(engine, context),
      ),
      createElement(
        "div",
        { className: "ad-screen__hud", ref: setHudElement },
        slot(hud ?? children, context),
        createElement(
          "div",
          { className: "ad-screen__overlay", ref: setScaledRoot },
          slot(overlayScaled, context),
        ),
      ),
      createElement(
        "div",
        { className: "ad-screen__overlay ad-screen__overlay--unscaled", ref: setUnscaledRoot },
        slot(overlayUnscaled, context),
      ),
    ),
  );
});
