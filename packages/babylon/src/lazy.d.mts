export interface SceneState {
  loading: boolean;
  ready: boolean;
  disposed: boolean;
}
export interface SceneHandle {
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
      ): { resize(): void; destroy(): void };
    }>;
    onState?(state: SceneState): void;
    onError?(message: string): void;
  },
): SceneHandle;
