import type { DefineComponent, InjectionKey, Plugin, Ref } from "vue";
import type { ScreenLayout, ScreenOptions } from "./core.mjs";
import type { ScreenActions } from "./controller.mjs";
export interface VueScreenContext extends ScreenActions {
  layout: Readonly<Ref<ScreenLayout | null>>;
  scaledRoot: Readonly<Ref<HTMLElement | null>>;
  unscaledRoot: Readonly<Ref<HTMLElement | null>>;
}
export const AD_SCREEN_CONTEXT: InjectionKey<VueScreenContext>;
export function useAdScreen(): VueScreenContext;
export interface VueScreenHandle extends ScreenActions {
  layout: ScreenLayout | null;
  scaledRoot: HTMLElement | null;
  unscaledRoot: HTMLElement | null;
}
export const AdScreen: DefineComponent<
  ScreenOptions & { onLayout?: (layout: ScreenLayout) => void }
>;
export const AdScreenPlugin: Plugin;
