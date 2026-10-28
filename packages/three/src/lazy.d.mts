import type { ThreeOptions } from "./index.mjs";
export interface LazySceneState {
  loading: boolean;
  ready: boolean;
}
export interface LazySceneHandle {
  start(): Promise<void>;
  setPixelRatio(value?: number): void;
  loadModel(buffer: ArrayBuffer): Promise<boolean>;
  clearModel(): void;
  destroy(): void;
}
export function createLazyScene(
  host: HTMLElement,
  options?: ThreeOptions & { onState?: (state: LazySceneState) => void },
): LazySceneHandle;
