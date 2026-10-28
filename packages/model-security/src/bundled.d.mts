export interface BundledModel {
  readonly name: string;
  readonly modelId: string;
  readonly keyId: string;
  readonly url: string;
}
export function fetchBundledAdui(
  asset: BundledModel,
  options?: { signal?: AbortSignal; fetcher?: typeof fetch; baseUrl?: string },
): Promise<ArrayBuffer>;
