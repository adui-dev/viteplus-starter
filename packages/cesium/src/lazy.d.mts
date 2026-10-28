export interface GlobeState {
  loading: boolean;
  ready: boolean;
  disposed: boolean;
}
export interface GlobeHandle {
  load(): Promise<void>;
  destroy(): void;
}
export function createLazyGlobe(
  host: HTMLElement,
  options: {
    load(): Promise<{ createGlobe(host: HTMLElement): import("cesium").Viewer }>;
    onState?(state: GlobeState): void;
    onError?(message: string): void;
  },
): GlobeHandle;
