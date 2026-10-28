import { createLazyGlobe } from "./lazy.mjs";
export function mountGlobeDemo(container) {
  const host = document.createElement("div"),
    toolbar = document.createElement("div");
  host.className = "cesium-host";
  toolbar.className = "cesium-controls";
  const button = document.createElement("button"),
    status = document.createElement("span");
  button.textContent = "加载 Cesium";
  status.textContent = "等待加载";
  status.setAttribute("role", "status");
  toolbar.append(button, status);
  container.append(host, toolbar);
  const globe = createLazyGlobe(host, {
    async load() {
      // Set before importing Cesium. Vite's BASE_URL supports /, /sub/ and ./ deployments.
      Reflect.set(
        globalThis,
        "CESIUM_BASE_URL",
        new URL("adui-cesium/", new URL(import.meta.env.BASE_URL, document.baseURI)).href,
      );
      return import("./scene.mjs");
    },
    onState(value) {
      button.disabled = value.loading || value.ready;
      status.textContent = JSON.stringify(value);
      container.dataset.cesiumState = status.textContent;
    },
    onError(message) {
      status.textContent = message;
    },
  });
  const click = () => {
    void globe.load();
  };
  button.addEventListener("click", click);
  return () => {
    button.removeEventListener("click", click);
    globe.destroy();
    host.remove();
    toolbar.remove();
  };
}
