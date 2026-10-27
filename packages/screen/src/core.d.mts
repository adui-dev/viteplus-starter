export type ScreenMode = "contain" | "cover" | "stretch" | "none";
export interface Insets {
  top: number;
  right: number;
  bottom: number;
  left: number;
}
export interface ScreenOptions {
  designWidth?: number;
  designHeight?: number;
  mode?: ScreenMode;
  allowUpscale?: boolean;
  engineInsets?: Partial<Insets>;
}
export interface ScreenLayout {
  designWidth: number;
  designHeight: number;
  mode: ScreenMode;
  allowUpscale: boolean;
  engineInsets: Insets;
  containerWidth: number;
  containerHeight: number;
  visible: boolean;
  scaleX: number;
  scaleY: number;
  left: number;
  top: number;
  width: number;
  height: number;
  engine: { left: number; top: number; width: number; height: number };
}
export interface DesignPoint {
  x: number;
  y: number;
  inside: boolean;
}
export function normalizeOptions(
  input?: ScreenOptions,
): Required<Omit<ScreenOptions, "engineInsets">> & { engineInsets: Insets };
export function calculateLayout(
  containerWidth: number,
  containerHeight: number,
  input?: ScreenOptions,
): ScreenLayout;
export function toDesignPoint(layout: ScreenLayout, x: number, y: number): DesignPoint | null;
