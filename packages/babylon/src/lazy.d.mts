export interface SceneState {
  loading: boolean;
  ready: boolean;
  disposed: boolean;
}
export interface SceneHandle {
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
  options: {
    load(): Promise<{
      createScene(
        canvas: HTMLCanvasElement,
        onError: (message: string) => void,
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
  },
): SceneHandle;
