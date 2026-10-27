import type { DesignPoint, ScreenLayout, ScreenOptions } from "./core.mjs";
export interface ScreenActions {
  refresh(): void;
  clientToDesign(clientX: number, clientY: number): DesignPoint | null;
  requestFullscreen(): Promise<void>;
  exitFullscreen(): Promise<void>;
}
export interface ScreenController extends ScreenActions {
  readonly layout: ScreenLayout | null;
  update(options: ScreenOptions): void;
  destroy(): void;
}
export function createScreenController(
  elements: { shell: HTMLElement; hud: HTMLElement; engine: HTMLElement },
  options?: ScreenOptions,
  onLayout?: (layout: ScreenLayout) => void,
): ScreenController;
