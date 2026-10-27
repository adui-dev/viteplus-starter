import {
  defineComponent,
  h,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  readonly,
  ref,
  shallowRef,
  watch,
} from "vue";
import { createScreenController } from "./controller.mjs";
import "./style.css";

export const AD_SCREEN_CONTEXT = Symbol("adui-screen");
export function useAdScreen() {
  const context = inject(AD_SCREEN_CONTEXT, null);
  if (!context) throw new Error("useAdScreen 必须在 AdScreen 内使用");
  return context;
}
export const AdScreen = defineComponent({
  name: "AdScreen",
  inheritAttrs: false,
  props: {
    designWidth: { type: Number, default: 1920 },
    designHeight: { type: Number, default: 1080 },
    mode: { type: String, default: "contain" },
    allowUpscale: { type: Boolean, default: true },
    engineInsets: { type: Object, default: () => ({}) },
  },
  emits: ["layout"],
  setup(props, { attrs, slots, expose, emit }) {
    const shell = ref(null),
      hud = ref(null),
      engine = ref(null);
    const scaledRoot = ref(null),
      unscaledRoot = ref(null),
      layout = shallowRef(null);
    let controller = null;
    const context = {
      layout: readonly(layout),
      scaledRoot: readonly(scaledRoot),
      unscaledRoot: readonly(unscaledRoot),
      refresh: () => controller?.refresh(),
      clientToDesign: (x, y) => controller?.clientToDesign(x, y) ?? null,
      requestFullscreen: () =>
        controller
          ? controller.requestFullscreen()
          : Promise.reject(new Error("AdScreen 尚未挂载")),
      exitFullscreen: () => controller?.exitFullscreen() ?? Promise.resolve(),
    };
    provide(AD_SCREEN_CONTEXT, context);
    expose(context);
    onMounted(() => {
      controller = createScreenController(
        { shell: shell.value, hud: hud.value, engine: engine.value },
        props,
        (next) => {
          layout.value = next;
          emit("layout", next);
        },
      );
    });
    watch(
      [
        () => props.designWidth,
        () => props.designHeight,
        () => props.mode,
        () => props.allowUpscale,
        () => JSON.stringify(props.engineInsets),
      ],
      () => controller?.update(props),
    );
    onBeforeUnmount(() => {
      controller?.destroy();
      controller = null;
    });
    return () =>
      h("section", { ...attrs, class: ["ad-screen", attrs.class], ref: shell }, [
        h("div", { class: "ad-screen__engine", ref: engine }, slots.engine?.(context)),
        h("div", { class: "ad-screen__hud", ref: hud }, [
          (slots.hud ?? slots.default)?.(context),
          h(
            "div",
            { class: "ad-screen__overlay", ref: scaledRoot },
            slots.overlayScaled?.(context),
          ),
        ]),
        h(
          "div",
          { class: "ad-screen__overlay ad-screen__overlay--unscaled", ref: unscaledRoot },
          slots.overlayUnscaled?.(context),
        ),
      ]);
  },
});
export const AdScreenPlugin = {
  install(app) {
    app.component("AdScreen", AdScreen);
  },
};
