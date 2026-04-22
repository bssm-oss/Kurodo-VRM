import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { VRMLoaderPlugin, VRMUtils } from "@pixiv/three-vrm";
import { VRMAnimationLoaderPlugin, createVRMAnimationClip } from "@pixiv/three-vrm-animation";

export const VRMLoader = (() => {
  let scene, camera, renderer, currentVRM, clock, animId;
  let mixer = null;
  let isLoaded = false;
  let isTalking = false;
  let talkTimer = 0;
  let currentEmotion = "normal";

  // 슬롯별 사용자 업로드 AnimationAction
  const actions = {};
  let currentSlot = "idle";

  const EMOTION_EXPRESSIONS = {
    normal:    [],
    happy:     [["happy", 1.0]],
    surprised: [["surprised", 1.0]],
    shy:       [["relaxed", 0.8]],
  };
  const ALL_EXPRESSIONS   = ["happy", "surprised", "relaxed", "angry", "sad"];
  const MOUTH_EXPRESSIONS = ["aa", "ih", "ou", "ee", "oh"];
  const EMOTION_SLOT      = { happy: "happy", surprised: "surprised", shy: "shy" };

  // ── 절차적 기본 모션 ──────────────────────────────────────────
  // 사용자가 슬롯에 VRMA를 올리지 않으면 이 함수들이 대신 실행됨
  const DEFAULT_MOTIONS = {
    idle: (vrm, t) => {
      bone(vrm, "spine", (b) => { b.rotation.x = Math.sin(t * 0.4) * 0.008; });
      bone(vrm, "head",  (b) => { b.rotation.y = Math.sin(t * 0.35) * 0.03; });
    },

    talking: (vrm, t) => {
      bone(vrm, "spine", (b) => { b.rotation.x = Math.sin(t * 1.0) * 0.012; });
      bone(vrm, "head",  (b) => {
        b.rotation.x = Math.sin(t * 1.5) * 0.025; // 끄덕임
        b.rotation.y = Math.sin(t * 0.7) * 0.02;
      });
    },

    happy: (vrm, t) => {
      bone(vrm, "spine",         (b) => { b.rotation.z = Math.sin(t * 3.0) * 0.03; });
      bone(vrm, "head",          (b) => { b.rotation.z = Math.sin(t * 3.0 + 0.5) * 0.04; });
      bone(vrm, "leftUpperArm",  (b) => { b.rotation.z = -0.3 + Math.sin(t * 3.0) * 0.1; });
      bone(vrm, "rightUpperArm", (b) => { b.rotation.z =  0.3 - Math.sin(t * 3.0) * 0.1; });
    },

    surprised: (vrm, t) => {
      bone(vrm, "spine", (b) => { b.rotation.x = -0.04 + Math.sin(t * 5) * 0.005; });
      bone(vrm, "head",  (b) => { b.rotation.x = -0.06 + Math.sin(t * 5) * 0.005; });
    },

    shy: (vrm, t) => {
      bone(vrm, "neck", (b) => { b.rotation.x =  0.06; });
      bone(vrm, "head", (b) => {
        b.rotation.x =  0.12 + Math.sin(t * 0.3) * 0.008;
        b.rotation.z = -0.08 + Math.sin(t * 0.4) * 0.01;
      });
    },
  };

  // 절차적 모션이 건드리는 뼈 목록 (전환 시 리셋용)
  const PROCEDURAL_BONES = ["spine", "head", "neck", "leftUpperArm", "rightUpperArm"];

  function bone(vrm, name, fn) {
    const node = vrm.humanoid?.getNormalizedBoneNode(name);
    if (node) fn(node);
  }

  function resetProceduralBones() {
    if (!currentVRM) return;
    PROCEDURAL_BONES.forEach((name) => {
      const node = currentVRM.humanoid?.getNormalizedBoneNode(name);
      if (node) node.rotation.set(0, 0, 0);
    });
  }
  // ─────────────────────────────────────────────────────────────

  function setExpression(name, value) {
    if (!currentVRM?.expressionManager) return;
    currentVRM.expressionManager.setValue(name, value);
  }

  function setupScene(container) {
    const w = container.clientWidth  || 300;
    const h = container.clientHeight || 400;

    scene  = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(28, w / h, 0.1, 20);
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

    new ResizeObserver(() => {
      const w2 = container.clientWidth;
      const h2 = container.clientHeight;
      camera.aspect = w2 / h2;
      camera.updateProjectionMatrix();
      renderer.setSize(w2, h2);
    }).observe(container);
  }

  // 슬롯 전환: VRMA가 있으면 mixer, 없으면 절차적 기본
  function switchSlot(slot) {
    const next = actions[slot];
    const prev = actions[currentSlot];

    if (next) {
      // VRMA로 전환
      resetProceduralBones();
      if (prev && prev !== next) prev.fadeOut(0.3);
      next.reset();
      next.setLoop(THREE.LoopRepeat, Infinity);
      next.fadeIn(0.3).play();
    } else {
      // 절차적 기본으로 전환
      if (prev) prev.fadeOut(0.2);
    }

    currentSlot = slot;
  }

  function returnToBase() {
    if (isTalking) {
      switchSlot("talking");
    } else {
      switchSlot(EMOTION_SLOT[currentEmotion] ?? "idle");
    }
  }

  function renderLoop() {
    animId = requestAnimationFrame(renderLoop);
    const delta   = clock.getDelta();
    const elapsed = clock.elapsedTime;

    if (currentVRM) {
      const hasVRMA = !!actions[currentSlot];

      if (hasVRMA) {
        mixer.update(delta);
      } else {
        // 절차적 기본 모션 실행
        (DEFAULT_MOTIONS[currentSlot] ?? DEFAULT_MOTIONS.idle)(currentVRM, elapsed);

        // VRMA talking 없을 때만 사인파 립싱크 사용
        if (isTalking) {
          talkTimer += delta;
          setExpression("aa", Math.max(0, 0.3 + Math.sin(talkTimer * 10) * 0.35));
        } else {
          setExpression("aa", 0);
        }
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
      mixer?.stopAllAction();
    }

    currentVRM = vrm;
    vrm.scene.rotation.y = Math.PI;
    scene.add(vrm.scene);

    mixer = new THREE.AnimationMixer(vrm.scene);
    mixer.addEventListener("finished", returnToBase);
    Object.keys(actions).forEach((k) => delete actions[k]);
    currentSlot = "idle";

    isLoaded = true;
    setEmotion(currentEmotion);
    renderLoop();
    return vrm;
  }

  async function loadMotion(slot, url) {
    if (!currentVRM) throw new Error("VRM을 먼저 로드하세요.");

    const loader = new GLTFLoader();
    loader.register((parser) => new VRMAnimationLoaderPlugin(parser));

    const gltf = await loader.loadAsync(url);
    const vrmAnimations = gltf.userData.vrmAnimations;
    if (!vrmAnimations?.length) throw new Error("VRMA 데이터를 찾을 수 없습니다.");

    const clip    = createVRMAnimationClip(vrmAnimations[0], currentVRM);
    actions[slot] = mixer.clipAction(clip);

    // 현재 슬롯과 일치하면 즉시 VRMA로 전환
    if (slot === currentSlot) switchSlot(slot);
  }

  function setEmotion(emotion) {
    currentEmotion = emotion;
    if (!currentVRM?.expressionManager) return;
    ALL_EXPRESSIONS.forEach((name) => setExpression(name, 0));
    (EMOTION_EXPRESSIONS[emotion] ?? []).forEach(([name, val]) => setExpression(name, val));
    if (!isTalking) switchSlot(EMOTION_SLOT[emotion] ?? "idle");
  }

  function startTalking() {
    isTalking = true;
    talkTimer = 0;
    switchSlot("talking");
  }

  function stopTalking() {
    isTalking = false;
    MOUTH_EXPRESSIONS.forEach((name) => setExpression(name, 0));
    returnToBase();
  }

  return {
    load,
    loadMotion,
    setEmotion,
    startTalking,
    stopTalking,
    get isLoaded() { return isLoaded; },
  };
})();
