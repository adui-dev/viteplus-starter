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
  model: "empty" | "loading" | "ready" | "error";
  modelError: string;
  modelMeshes: number;
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
  loadModel(buffer: ArrayBuffer): Promise<boolean>;
  cancelModelLoad(): void;
  clearModel(): void;
  destroy(): void;
}
export function createThreeScene(host: HTMLElement, options?: ThreeOptions): ThreeHandle;
