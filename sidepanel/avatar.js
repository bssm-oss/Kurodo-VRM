const AvatarCanvas = (() => {
  let cv, ctx, W, H;
  let state = {
    emotion: "normal",
    mouthOpen: 0,
    eyeOpenL: 1, eyeOpenR: 1,
    blinkTimer: 0, blinkState: 0,
    headX: 0, headY: 0,
    headTargetX: 0, headTargetY: 0,
    pupilX: 0, pupilY: 0,
    talking: false,
    talkTimer: 0,
    breathe: 0,
    t: 0,
  };

  const EMOTIONS = {
    normal:    { eyebrow: 0,  cheek: 0,   eyeSquint: 0,  smile: 0 },
    happy:     { eyebrow: -3, cheek: 0.7, eyeSquint: 0.2, smile: 3 },
    surprised: { eyebrow: 6,  cheek: 0,   eyeSquint: 0,  smile: 0 },
    shy:       { eyebrow: -2, cheek: 0.9, eyeSquint: 0.15, smile: 2 },
  };

  function lerp(a, b, t) { return a + (b - a) * t; }

  function resize() {
    const rect = cv.parentElement.getBoundingClientRect();
    W = cv.width  = Math.floor(rect.width)  || 300;
    H = cv.height = Math.floor(rect.height) || 400;
  }

  function draw() {
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    const em = EMOTIONS[state.emotion] || EMOTIONS.normal;
    state.t += 0.03;
    state.breathe    = Math.sin(state.t * 0.6) * 1.5;
    const sway       = Math.sin(state.t * 0.4) * 2;
    const hairSway   = Math.sin(state.t * 0.5) * 1.5;

    state.headX = lerp(state.headX, state.headTargetX, 0.05);
    state.headY = lerp(state.headY, state.headTargetY, 0.05);

    state.blinkTimer++;
    if (state.blinkState === 0 && state.blinkTimer > 120 + Math.random() * 80) {
      state.blinkState = 1; state.blinkTimer = 0;
    }
    if (state.blinkState === 1) {
      state.eyeOpenL = Math.max(0, state.eyeOpenL - 0.2);
      state.eyeOpenR = state.eyeOpenL;
      if (state.eyeOpenL <= 0) state.blinkState = 2;
    }
    if (state.blinkState === 2) {
      state.eyeOpenL = Math.min(1, state.eyeOpenL + 0.2);
      state.eyeOpenR = state.eyeOpenL;
      if (state.eyeOpenL >= 1) { state.blinkState = 0; state.blinkTimer = 0; }
    }

    if (state.talking) {
      state.talkTimer++;
      state.mouthOpen = 0.4 + Math.sin(state.talkTimer * 0.5) * 0.35;
    } else {
      state.mouthOpen = lerp(state.mouthOpen, 0, 0.15);
    }

    const scale = Math.min(W, H) / 300;
    const cx = W / 2 + state.headX + sway;
    const cy = H * 0.48 + state.headY + state.breathe;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.scale(scale, scale);

    // Hair back
    ctx.save();
    ctx.rotate(hairSway * 0.01);
    ctx.fillStyle = "#3a2060";
    ctx.beginPath(); ctx.ellipse(0, -18, 52, 62, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(-46, 30, 14, 55, -0.18, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(46, 30, 14, 55, 0.18, 0, Math.PI * 2); ctx.fill();
    ctx.restore();

    // Neck
    ctx.fillStyle = "#FDDBB0";
    ctx.beginPath(); ctx.roundRect(-11, 52, 22, 26, 4); ctx.fill();

    // Body
    ctx.fillStyle = "#7c5cbf";
    ctx.beginPath();
    ctx.moveTo(-44, 90); ctx.lineTo(44, 90);
    ctx.lineTo(60, 180); ctx.lineTo(-60, 180);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.moveTo(-16, 76); ctx.lineTo(0, 100); ctx.lineTo(16, 76); ctx.fill();

    // Face
    ctx.fillStyle = "#FDDBB0";
    ctx.beginPath(); ctx.ellipse(0, 10, 44, 50, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(0, 38, 36, 22, 0, 0, Math.PI * 2); ctx.fill();

    // Cheeks
    if (em.cheek > 0) {
      ctx.globalAlpha = em.cheek * 0.28;
      ctx.fillStyle = "#f08080";
      ctx.beginPath(); ctx.ellipse(-26, 22, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(26, 22, 14, 8, 0, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }

    // Eyebrows
    const ebY = em.eyebrow;
    ctx.strokeStyle = "#3a2060"; ctx.lineWidth = 2.4; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-22, -6 + ebY); ctx.quadraticCurveTo(-14, -10 + ebY, -6, -7 + ebY); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(22, -6 + ebY); ctx.quadraticCurveTo(14, -10 + ebY, 6, -7 + ebY); ctx.stroke();

    // Eyes
    const sqt = 1 - em.eyeSquint * 0.5;
    for (const [tx, flip] of [[-16, 1], [16, -1]]) {
      ctx.save();
      ctx.translate(tx, 8);
      const eo = tx < 0 ? state.eyeOpenL : state.eyeOpenR;
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(0, 0, 11, 9 * eo * sqt, 0, 0, Math.PI * 2); ctx.fill();
      if (eo > 0.1) {
        ctx.fillStyle = "#5533a0";
        ctx.beginPath(); ctx.ellipse(flip * state.pupilX * 2 * -1, state.pupilY * 2, 6, 6 * eo * sqt, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#111";
        ctx.beginPath(); ctx.ellipse(flip * state.pupilX * 2 * -1, state.pupilY * 2, 4, 4 * eo * sqt, 0, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = "#fff"; ctx.globalAlpha = 0.85;
        ctx.beginPath(); ctx.ellipse(flip * -2, -2, 2.5, 2.5, 0, 0, Math.PI * 2); ctx.fill();
        ctx.globalAlpha = 1;
        ctx.strokeStyle = "#222"; ctx.lineWidth = 2; ctx.lineCap = "round";
        const lashes = [[-10,-5,-12,-9],[-5,-8,-5,-12],[0,-9,1,-13],[5,-8,6,-12],[9,-5,12,-8]];
        for (const [x1,y1,x2,y2] of lashes) {
          ctx.beginPath(); ctx.moveTo(x1 * flip, y1); ctx.lineTo(x2 * flip, y2); ctx.stroke();
        }
      }
      ctx.restore();
    }

    // Nose
    ctx.strokeStyle = "#d4956a"; ctx.lineWidth = 1.2; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(-3, 28); ctx.quadraticCurveTo(0, 31, 3, 28); ctx.stroke();

    // Mouth
    const mOpen = state.mouthOpen;
    if (mOpen > 0.05) {
      ctx.fillStyle = "#c0607a";
      ctx.beginPath(); ctx.ellipse(0, 40, 10, 4 + mOpen * 7, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.ellipse(0, 40 + mOpen * 2, 6, 2.5 * mOpen, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#c0607a"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(-10, 38); ctx.quadraticCurveTo(-5, 35, 0, 37); ctx.quadraticCurveTo(5, 35, 10, 38); ctx.stroke();
    } else {
      ctx.strokeStyle = "#c0607a"; ctx.lineWidth = 1.8; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(-10, 40); ctx.quadraticCurveTo(0, 44 + em.smile, 10, 40); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-9, 38); ctx.quadraticCurveTo(-4, 35, 0, 37); ctx.quadraticCurveTo(4, 35, 9, 38); ctx.stroke();
    }

    // Hair front / bangs
    ctx.save();
    ctx.rotate(hairSway * 0.008);
    ctx.fillStyle = "#4a2880";
    ctx.beginPath();
    ctx.moveTo(-50, -18);
    ctx.quadraticCurveTo(-48, -68, 0, -66);
    ctx.quadraticCurveTo(48, -68, 50, -18);
    ctx.quadraticCurveTo(38, -10, 28, -22);
    ctx.quadraticCurveTo(14, -8, 4, -26);
    ctx.quadraticCurveTo(0, -30, -4, -26);
    ctx.quadraticCurveTo(-14, -8, -28, -22);
    ctx.quadraticCurveTo(-38, -10, -50, -18);
    ctx.fill();
    // Ahoge
    ctx.fillStyle = "#4a2880";
    ctx.beginPath();
    ctx.moveTo(-4, -64);
    ctx.quadraticCurveTo(
      Math.sin(state.t * 1.2) * 6,
      -90 + Math.cos(state.t * 0.9) * 4,
      6, -68
    );
    ctx.quadraticCurveTo(2, -66, -4, -64);
    ctx.fill();
    ctx.restore();

    // Star clip
    ctx.save();
    ctx.translate(30, -32);
    ctx.fillStyle = "#ffdd44";
    for (let i = 0; i < 5; i++) {
      ctx.save(); ctx.rotate((i * 72 * Math.PI) / 180);
      ctx.fillRect(-1.5, -8, 3, 8); ctx.restore();
    }
    ctx.beginPath(); ctx.arc(0, 0, 4, 0, Math.PI * 2);
    ctx.fillStyle = "#ffaa00"; ctx.fill();
    ctx.restore();

    ctx.restore();
    requestAnimationFrame(draw);
  }

  function init(canvasEl) {
    cv = canvasEl;
    ctx = cv.getContext("2d");
    resize();
    window.addEventListener("resize", resize);
    cv.addEventListener("mousemove", (e) => {
      const r = cv.getBoundingClientRect();
      state.headTargetX = ((e.clientX - r.left) / r.width - 0.5) * 14;
      state.headTargetY = ((e.clientY - r.top) / r.height - 0.5) * 8;
      state.pupilX = ((e.clientX - r.left) / r.width - 0.5) * 0.6;
      state.pupilY = ((e.clientY - r.top) / r.height - 0.5) * 0.6;
    });
    cv.addEventListener("mouseleave", () => {
      state.headTargetX = 0; state.headTargetY = 0;
      state.pupilX = 0; state.pupilY = 0;
    });
    draw();
  }

  function setEmotion(emotion) {
    if (EMOTIONS[emotion]) state.emotion = emotion;
  }

  function startTalking() { state.talking = true; state.talkTimer = 0; }
  function stopTalking()  { state.talking = false; }

  return { init, setEmotion, startTalking, stopTalking };
})();
