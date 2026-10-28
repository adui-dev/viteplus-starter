import { createModelController, modelBounds } from "./model.mjs";
export function bufferSize(width, height, pixelRatio, maxDimension = 8192) {
  if (![width, height].every((value) => Number.isFinite(value) && value >= 0))
    throw new Error("无效的 Three.js 容器尺寸");
  if (!Number.isFinite(pixelRatio) || pixelRatio <= 0) throw new Error("DPR 必须为正有限数");
  const ratio = Math.min(2, pixelRatio, maxDimension / Math.max(1, width, height));
  return {
    width,
    height,
    pixelRatio: ratio,
    bufferWidth: Math.max(1, Math.floor(width * ratio)),
    bufferHeight: Math.max(1, Math.floor(height * ratio)),
  };
}

// Dependency injection keeps lifecycle tests independent of a browser/WebGL driver.
export function mountScene(THREE, host, options = {}) {
  const view = host.ownerDocument.defaultView;
  let override = options.pixelRatio;
  bufferSize(0, 0, override ?? view.devicePixelRatio ?? 1);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  const canvas = renderer.domElement;
  let geometry, material, observer, models, modelGroup, environment;
  let modelRadius = 1;
  let disposed = false,
    key = "";
  let status = {
    width: 0,
    height: 0,
    bufferWidth: 1,
    bufferHeight: 1,
    pixelRatio: 1,
    frames: 0,
    picks: 0,
    selected: false,
    disposed: false,
    model: "empty",
    modelError: "",
    modelMeshes: 0,
  };
  const notify = () => options.onStatus?.({ ...status });
  const cleanup = () => {
    if (disposed) return;
    disposed = true;
    renderer.setAnimationLoop(null);
    observer?.disconnect();
    view.removeEventListener("resize", resize);
    canvas.removeEventListener("pointerdown", pick);
    canvas.removeEventListener("webglcontextlost", lost);
    models?.destroy();
    environment?.dispose();
    geometry?.dispose();
    material?.dispose();
    renderer.dispose();
    renderer.forceContextLoss();
    canvas.remove();
    status = { ...status, disposed: true };
  };
  let scene, camera, mesh, raycaster;
  function resize() {
    if (disposed) return;
    const size = bufferSize(
      host.clientWidth,
      host.clientHeight,
      override ?? view.devicePixelRatio ?? 1,
      Math.min(8192, renderer.capabilities.maxTextureSize),
    );
    const nextKey = [size.width, size.height, size.pixelRatio].join(":");
    if (key === nextKey) return;
    key = nextKey;
    if (size.width && size.height) {
      renderer.setPixelRatio(size.pixelRatio);
      renderer.setSize(size.width, size.height, false);
      camera.aspect = size.width / size.height;
      if (modelGroup) fitCamera();
      camera.updateProjectionMatrix();
    }
    status = { ...status, ...size };
    notify();
  }
  function pick(event) {
    if (disposed || !status.width || !status.height) return;
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const x = (event.clientX - rect.left) / rect.width,
      y = (event.clientY - rect.top) / rect.height;
    if (x < 0 || x > 1 || y < 0 || y > 1) return;
    scene.updateMatrixWorld(true);
    camera.updateMatrixWorld(true);
    raycaster.setFromCamera({ x: x * 2 - 1, y: 1 - y * 2 }, camera);
    const selected = raycaster.intersectObject(modelGroup ?? mesh, true).length > 0;
    if (!modelGroup) material.color.set(selected ? 0xffb454 : 0x43d9d0);
    status = { ...status, picks: status.picks + 1, selected };
    notify();
  }
  function lost(event) {
    event.preventDefault();
    cleanup();
    options.onError?.(new Error("WebGL 上下文已丢失，请卸载后重新挂载"));
    notify();
  }
  function fitCamera() {
    camera.position.z =
      modelRadius / Math.sin((camera.fov * Math.PI) / 360) / Math.min(1, camera.aspect);
    camera.near = camera.position.z / 100;
    camera.far = camera.position.z * 100;
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }
  try {
    scene = new THREE.Scene();
    scene.background = new THREE.Color(0x081522);
    camera = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    camera.position.z = 5;
    geometry = new THREE.BoxGeometry(1.6, 1.6, 1.6);
    // A basic material makes selection color observable without lighting dependencies.
    material = new THREE.MeshBasicMaterial({ color: 0x43d9d0, wireframe: true });
    mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    raycaster = new THREE.Raycaster();
    models = createModelController({
      parse: (buffer) => THREE.parseGlb(buffer),
      install(asset) {
        const box = new THREE.Box3().setFromObject(asset.scene);
        const size = box.getSize(new THREE.Vector3()),
          center = box.getCenter(new THREE.Vector3());
        const bounds = modelBounds(size);
        if (![center.x, center.y, center.z].every(Number.isFinite))
          throw new Error("GLB 场景中心无效");
        if (!environment) {
          environment = THREE.createEnvironment(renderer);
          scene.environment = environment.texture;
          scene.add(new THREE.HemisphereLight(0xffffff, 0x334455, 1.5));
          const keyLight = new THREE.DirectionalLight(0xffffff, 3);
          keyLight.position.set(3, 4, 5);
          scene.add(keyLight);
        }
        const group = new THREE.Group();
        asset.viewRoot = group;
        asset.scene.position.sub(center);
        group.add(asset.scene);
        group.scale.setScalar(bounds.scale);
        modelRadius = bounds.radius;
        modelGroup = group;
        scene.add(group);
        fitCamera();
        let meshes = 0;
        asset.scene.traverse((node) => {
          if (node.isMesh) meshes++;
        });
        status.modelMeshes = meshes;
      },
      remove(asset) {
        if (asset.viewRoot) scene.remove(asset.viewRoot);
        if (modelGroup === asset.viewRoot) {
          modelGroup = null;
          status.modelMeshes = 0;
        }
      },
      onState(model, modelError) {
        if (disposed) return;
        mesh.visible = !modelGroup;
        if (!modelGroup) {
          camera.position.z = 5;
          camera.near = 0.1;
          camera.far = 100;
          camera.updateProjectionMatrix();
        }
        status = { ...status, model, modelError, selected: false };
        notify();
      },
      onError: (error) => options.onError?.(error),
    });
    Object.assign(canvas.style, { display: "block", width: "100%", height: "100%" });
    canvas.setAttribute("aria-label", "Three.js 场景");
    host.appendChild(canvas);
    canvas.addEventListener("pointerdown", pick);
    canvas.addEventListener("webglcontextlost", lost);
    view.addEventListener("resize", resize);
    observer = view.ResizeObserver ? new view.ResizeObserver(resize) : null;
    observer?.observe(host);
    resize();
    renderer.setAnimationLoop((time) => {
      if (disposed) return;
      resize(); // Also detects DPR-only changes when moving between displays.
      if (!status.width || !status.height) return;
      mesh.rotation.y = time * 0.0003;
      mesh.rotation.x = 0.25;
      if (modelGroup) modelGroup.rotation.y = Math.sin(time * 0.00015) * 0.25;
      renderer.render(scene, camera);
      status.frames++;
    });
  } catch (error) {
    cleanup();
    throw error;
  }
  return {
    canvas,
    get status() {
      return { ...status };
    },
    setPixelRatio(value) {
      if (disposed) return;
      bufferSize(0, 0, value ?? view.devicePixelRatio ?? 1);
      override = value;
      resize();
    },
    cancelModelLoad() {
      models.invalidate();
    },
    loadModel(buffer) {
      return models.load(buffer);
    },
    clearModel() {
      models.clear();
    },
    destroy() {
      if (disposed) return;
      cleanup();
      notify();
    },
  };
}
