export interface ThreeStatus {
  width: number;
  height: number;
  bufferWidth: number;
  bufferHeight: number;
  pixelRatio: number;
  frames: number;
  picks: number;
  selected: boolean;
  disposed: boolean;
}
export interface ThreeOptions {
  pixelRatio?: number;
  onStatus?: (status: ThreeStatus) => void;
  onError?: (error: Error) => void;
}
export interface ThreeHandle {
  readonly canvas: HTMLCanvasElement;
  readonly status: ThreeStatus;
  setPixelRatio(value?: number): void;
  destroy(): void;
}
export function createThreeScene(host: HTMLElement, options?: ThreeOptions): ThreeHandle;
