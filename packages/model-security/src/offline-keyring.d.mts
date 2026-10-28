import type { ModelMetadata, ModelGrant } from "./adui.mjs";
export function createOfflineKeyring(): {
  unlock(file: File): Promise<boolean>;
  authorize: (info: ModelMetadata) => Promise<ModelGrant>;
  lock(): void;
};
