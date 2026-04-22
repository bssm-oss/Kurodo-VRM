import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";

export const VRMLoader = (() => {
  let scene, camera, renderer, currentVRM, clock, animId;
  let isLoaded = false;
  let isTalking = false;
  let talkTimer = 0;
  let currentEmotion = "normal";

  // VRM1 기준 표정 이름 사용 (three-vrm이 VRM0도 자동 변환)
  const EMOTION_EXPRESSIONS = {
    normal:    [],
    happy:     [["happy", 1.0]],
    surprised: [["surprised", 1.0]],
    shy:       [["relaxed", 0.8]],
  };

  const ALL_EXPRESSIONS  = ["happy", "surprised", "relaxed", "angry", "sad"];
  const MOUTH_EXPRESSIONS = ["aa", "ih", "ou", "ee", "oh"];

  function setupScene(container) {
    const w = container.clientWidth  || 300;
    const h = container.clientHeight || 400;

    scene    = new THREE.Scene();
    camera   = new THREE.PerspectiveCamera(28, w / h, 0.1, 20);
    camera.position.set(0, 1.4, 3.0);
    camera.lookAt(new THREE.Vector3(0, 1.2, 0));

    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.domElement.style.cssText = "width:100%;height:100%;display:block;";
    container.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(0.5, 2, 2);
    scene.add(dir);

    clock = new THREE.Clock();

    // 컨테이너 크기 변경 시 자동 대응
    new ResizeObserver(() => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    }).observe(container);
  }

  function setExpression(name, value) {
    if (!currentVRM?.expressionManager) return;
    currentVRM.expressionManager.setValue(name, value);
  }

  function renderLoop() {
    animId = requestAnimationFrame(renderLoop);
    const delta = clock.getDelta();

    if (currentVRM) {
      if (isTalking) {
        talkTimer += delta;
        setExpression("aa", Math.max(0, 0.3 + Math.sin(talkTimer * 10) * 0.35));
      } else {
        setExpression("aa", 0);
      }
      currentVRM.update(delta);
    }

    renderer.render(scene, camera);
  }

  async function load(url, container) {
    if (!scene) setupScene(container);
    if (animId != null) cancelAnimationFrame(animId);

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMLoaderPlugin(parser));

    const gltf = await loader.loadAsync(url);
    const vrm  = gltf.userData.vrm;
    if (!vrm) throw new Error("VRM 데이터를 찾을 수 없습니다.");

    VRMUtils.removeUnnecessaryJoints(vrm.scene);

    if (currentVRM) {
      scene.remove(currentVRM.scene);
      VRMUtils.deepDispose(currentVRM.scene);
    }

    currentVRM = vrm;
    vrm.scene.rotation.y = Math.PI; // 카메라 방향으로 회전
    scene.add(vrm.scene);

    isLoaded = true;
    setEmotion(currentEmotion);
    renderLoop();
    return vrm;
  }

  function setEmotion(emotion) {
    currentEmotion = emotion;
    if (!currentVRM?.expressionManager) return;
    ALL_EXPRESSIONS.forEach((name) => setExpression(name, 0));
    (EMOTION_EXPRESSIONS[emotion] ?? []).forEach(([name, val]) => setExpression(name, val));
  }

  function startTalking() {
    isTalking = true;
    talkTimer = 0;
  }

  function stopTalking() {
    isTalking = false;
    MOUTH_EXPRESSIONS.forEach((name) => setExpression(name, 0));
  }

  return {
    load,
    setEmotion,
    startTalking,
    stopTalking,
    get isLoaded() { return isLoaded; },
  };
})();
