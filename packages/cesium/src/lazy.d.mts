export interface GlobeState {
  loading: boolean;
  ready: boolean;
  disposed: boolean;
}
export interface GlobeHandle {
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
export function createLazyGlobe(
  host: HTMLElement,
  options: {
    load(): Promise<{
      createGlobe(
        host: HTMLElement,
        onModelState?: (value: { state: string; message: string }) => void,
      ): {
        resize(): void;
        isDestroyed(): boolean;
        scene: { requestRender(): void };
        destroy(): void;
        loadModel?(buffer: ArrayBuffer, options?: unknown): Promise<boolean>;
        clearModel?(): void;
        cancelModelLoad?(): void;
      };
    }>;
    onState?(state: GlobeState): void;
    onError?(message: string): void;
    onModelState?(value: { state: string; message: string }): void;
  },
): GlobeHandle;
