export interface SceneState {
  loading: boolean;
  ready: boolean;
  disposed: boolean;
}
export interface SceneHandle {
  loadBundledModel(
    asset: import("../../model-security/src/bundled.mjs").BundledModel,
    options?: {
      authorize?: import("../../model-security/src/adui.mjs").DecryptOptions["authorize"];
      signal?: AbortSignal;
    },
  ): Promise<boolean>;
  loadModel(
    buffer: ArrayBuffer,
    options?: {
      encrypted?: boolean;
      authorize?: import("../../model-security/src/adui.mjs").DecryptOptions["authorize"];
    },
  ): Promise<boolean>;
  clearModel(): void;
  cancelModelLoad(): void;
  load(): Promise<void>;
  destroy(): void;
}
export function createLazyScene(
  host: HTMLElement,
  options?: {
    load?(): Promise<{
      createScene(
        canvas: HTMLCanvasElement,
        onError: (message: string) => void,
        onModelState?: (value: { state: string; message: string }) => void,
      ): {
        resize(): void;
        destroy(): void;
        loadModel?(buffer: ArrayBuffer, options?: unknown): Promise<boolean>;
        clearModel?(): void;
        cancelModelLoad?(): void;
      };
    }>;
    onState?(state: SceneState): void;
    onError?(message: string): void;
    onModelState?(value: { state: string; message: string }): void;
  },
): SceneHandle;
