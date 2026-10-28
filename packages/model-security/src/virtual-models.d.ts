declare module "virtual:adui-models" {
  const models: ReadonlyArray<{
    readonly name: string;
    readonly modelId: string;
    readonly keyId: string;
    readonly url: string;
  }>;
  export default models;
}
declare module "virtual:adui-model-key" {
  export function authorize(info: {
    keyId: string;
  }): Promise<{ key: CryptoKey; expiresAt: number }>;
}
