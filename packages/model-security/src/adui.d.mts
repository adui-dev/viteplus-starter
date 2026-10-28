export const MAX_MODEL_BYTES: number;
export const MAX_ADUI_BYTES: number;
export interface ModelMetadata {
  readonly modelId: string;
  readonly keyId: string;
  readonly format: "glb";
}
export interface ModelGrant {
  key: CryptoKey;
  expiresAt: number;
}
export interface DecryptOptions {
  authorize: (metadata: ModelMetadata, context: { signal?: AbortSignal }) => Promise<ModelGrant>;
  signal?: AbortSignal;
}
export function inspectAdui(buffer: ArrayBuffer): { metadata: ModelMetadata; headerLength: number };
export function encryptAdui(
  buffer: ArrayBuffer,
  key: CryptoKey,
  metadata: ModelMetadata,
): Promise<ArrayBuffer>;
export function decryptAdui(buffer: ArrayBuffer, options: DecryptOptions): Promise<ArrayBuffer>;
