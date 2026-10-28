import { createLazyScene } from "./lazy.mjs";
export function mountBabylonDemo(container) {
  const host = document.createElement("div"),
    toolbar = document.createElement("div"),
    button = document.createElement("button"),
    status = document.createElement("span");
  host.className = "babylon-host";
  toolbar.className = "babylon-controls";
  button.textContent = "加载 Babylon";
  status.textContent = "等待加载";
  status.setAttribute("role", "status");
  toolbar.append(button, status);
  container.append(host, toolbar);
  const scene = createLazyScene(host, {
    load: () => import("./scene.mjs"),
    onState(value) {
      button.disabled = value.loading || value.ready;
      status.textContent = JSON.stringify(value);
      container.dataset.babylonState = status.textContent;
    },
    onError(message) {
      status.textContent = message;
    },
  });
  const click = () => {
    void scene.load();
  };
  button.addEventListener("click", click);
  return () => {
    button.removeEventListener("click", click);
    scene.destroy();
    host.remove();
    toolbar.remove();
  };
}
