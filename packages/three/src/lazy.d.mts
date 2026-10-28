import type { ThreeOptions } from "./index.mjs";
import type { DecryptOptions } from "../../model-security/src/adui.mjs";
export interface LazySceneState {
  loading: boolean;
  ready: boolean;
}
export interface LazySceneHandle {
  start(): Promise<void>;
  setPixelRatio(value?: number): void;
  loadModel(buffer: ArrayBuffer): Promise<boolean>;
  cancelModelLoad(): void;
  loadEncryptedModel(buffer: ArrayBuffer, options: DecryptOptions): Promise<boolean>;
  clearModel(): void;
  destroy(): void;
}
export function createLazyScene(
  host: HTMLElement,
  options?: ThreeOptions & { onState?: (state: LazySceneState) => void },
): LazySceneHandle;
