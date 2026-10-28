import type { Plugin } from "vite-plus";
export function aduiModels(options?: {
  envFile?: string;
  modelsDir?: string;
  keyMode?: "external" | "embedded";
}): Plugin;
