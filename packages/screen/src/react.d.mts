import type { CSSProperties, ForwardRefExoticComponent, ReactNode, RefAttributes } from "react";
import type { ScreenLayout, ScreenOptions } from "./core.mjs";
import type { ScreenActions } from "./controller.mjs";
export interface ReactScreenContext extends ScreenActions {
  layout: ScreenLayout | null;
  scaledRoot: HTMLDivElement | null;
  unscaledRoot: HTMLDivElement | null;
}
export type ScreenContent = ReactNode | ((context: ReactScreenContext) => ReactNode);
export interface AdScreenProps extends ScreenOptions {
  className?: string;
  style?: CSSProperties;
  onLayout?: (layout: ScreenLayout) => void;
  engine?: ScreenContent;
  hud?: ScreenContent;
  children?: ScreenContent;
  overlayScaled?: ScreenContent;
  overlayUnscaled?: ScreenContent;
}
export function useAdScreen(): ReactScreenContext;
export const AdScreen: ForwardRefExoticComponent<AdScreenProps & RefAttributes<ReactScreenContext>>;
