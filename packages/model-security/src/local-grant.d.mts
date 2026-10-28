import type { ModelMetadata, ModelGrant } from "./adui.mjs";
export function createLocalGrant(): {
  select(file: File): Promise<boolean>;
  authorize(info: ModelMetadata): Promise<ModelGrant>;
  clear(): void;
};
