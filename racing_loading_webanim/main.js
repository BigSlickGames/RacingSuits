(() => {
  const canvas = document.getElementById("fx");
  const ctx = canvas.getContext("2d", { alpha: false });

  // --- Config ---
  const cfg = window.RACING_LOADING_CONFIG || {};
  const durationMs = typeof cfg.durationMs === "number" ? cfg.durationMs : 6500;
  const fadeOutMs = typeof cfg.fadeOutMs === "number" ? cfg.fadeOutMs : 600;

  const img = new Image();
  img.src = "racing_suits_banner.png";

  // Offscreen for base image
  const base = document.createElement("canvas");
  const bctx = base.getContext("2d", { alpha: false });

  // Confetti particles
  const confetti = [];
  const CONFETTI_COUNT = 140;

  // Region for "flag wave" (bottom-right checkered flag)
  // These are relative to the source image size (1365 x 2048)
  const FLAG_REGION = {
    x0: 0.72,  // start x (percent)
    x1: 0.99,  // end x
    y0: 0.74,  // start y
    y1: 0.99   // end y
  };

  // Resize handling
  function resize() {
    const dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1));
    canvas.width = Math.floor(window.innerWidth * dpr);
    canvas.height = Math.floor(window.innerHeight * dpr);
    canvas.style.width = window.innerWidth + "px";
    canvas.style.height = window.innerHeight + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener("resize", resize);

  function rand(min, max) { return min + Math.random() * (max - min); }

  function initConfetti() {
    confetti.length = 0;
    for (let i = 0; i < CONFETTI_COUNT; i++) {
      confetti.push({
        x: rand(0, window.innerWidth),
        y: rand(-window.innerHeight * 0.5, window.innerHeight),
        vx: rand(-30, 30),
        vy: rand(40, 160),
        rot: rand(0, Math.PI * 2),
        vr: rand(-6, 6),
        size: rand(4, 10),
        // bright-ish palette without hardcoding "brand colors"
        hue: rand(0, 360),
        sat: rand(70, 95),
        lit: rand(50, 65),
        a: rand(0.55, 0.95),
        depth: rand(0.6, 1.15),
      });
    }
  }

  function drawCoverImage(t, shakePx) {
    // t in [0..1]
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // cover scale
    const imgAR = img.width / img.height;
    const viewAR = vw / vh;

    let drawW, drawH;
    if (imgAR > viewAR) {
      drawH = vh;
      drawW = vh * imgAR;
    } else {
      drawW = vw;
      drawH = vw / imgAR;
    }

    // cinematic slow zoom + gentle vertical pan
    const zoom = 1.06 - 0.06 * easeOutCubic(t); // from 1.06 -> 1.0
    const panY = lerp(18, -12, easeInOutQuad(t));
    const cx = vw * 0.5;
    const cy = vh * 0.5;

    const dx = cx - (drawW * zoom) / 2 + shakePx.x;
    const dy = cy - (drawH * zoom) / 2 + panY + shakePx.y;

    ctx.drawImage(img, dx, dy, drawW * zoom, drawH * zoom);

    // Save for region warps
    base.width = Math.max(1, Math.floor(vw));
    base.height = Math.max(1, Math.floor(vh));
    bctx.setTransform(1, 0, 0, 1, 0, 0);
    bctx.drawImage(img, dx, dy, drawW * zoom, drawH * zoom);
  }

  function drawFlagWave(timeSec, intensity) {
    // Warp the bottom-right region only
    const vw = base.width;
    const vh = base.height;

    const rx0 = Math.floor(vw * FLAG_REGION.x0);
    const rx1 = Math.floor(vw * FLAG_REGION.x1);
    const ry0 = Math.floor(vh * FLAG_REGION.y0);
    const ry1 = Math.floor(vh * FLAG_REGION.y1);

    const regionW = rx1 - rx0;
    const regionH = ry1 - ry0;

    // Clip the region
    ctx.save();
    ctx.beginPath();
    ctx.rect(rx0, ry0, regionW, regionH);
    ctx.clip();

    // Repaint the region as scanlines with horizontal offsets
    const lines = 80;
    const lineH = Math.max(1, Math.floor(regionH / lines));

    for (let y = 0; y < regionH; y += lineH) {
      const phase = (y / regionH) * 6.0;
      const wave = Math.sin(timeSec * 5.2 + phase) + 0.5 * Math.sin(timeSec * 2.6 + phase * 1.7);
      const xOff = wave * 10 * intensity;

      ctx.drawImage(
        base,
        rx0, ry0 + y, regionW, lineH,
        rx0 + xOff, ry0 + y, regionW, lineH
      );
    }

    ctx.restore();
  }

  function drawLightBurst(t) {
    // subtle radial burst + vignette
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    // Pulse near racers / finish line
    const px = vw * 0.52;
    const py = vh * 0.62;

    const pulse = 0.18 + 0.22 * Math.sin(t * Math.PI * 2.0) * (1 - t * 0.25);
    const r = Math.max(vw, vh) * (0.55 + 0.10 * Math.sin(t * Math.PI));

    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, `rgba(255,255,255,${pulse})`);
    g.addColorStop(0.35, `rgba(255,255,255,${pulse * 0.35})`);
    g.addColorStop(1, "rgba(255,255,255,0)");

    ctx.save();
    ctx.globalCompositeOperation = "screen";
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, vw, vh);
    ctx.restore();

    // Vignette
    const vg = ctx.createRadialGradient(vw * 0.5, vh * 0.5, Math.min(vw, vh) * 0.2, vw * 0.5, vh * 0.5, Math.max(vw, vh) * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.35)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, vw, vh);
  }

  function stepConfetti(dt, wind, gravity) {
    for (const p of confetti) {
      p.x += (p.vx + wind) * dt * p.depth;
      p.y += (p.vy + gravity) * dt * p.depth;
      p.rot += p.vr * dt;

      // wrap
      if (p.y > window.innerHeight + 40) {
        p.y = rand(-80, -20);
        p.x = rand(0, window.innerWidth);
      }
      if (p.x < -60) p.x = window.innerWidth + 60;
      if (p.x > window.innerWidth + 60) p.x = -60;
    }
  }

  function drawConfetti(alphaMul) {
    ctx.save();
    for (const p of confetti) {
      const a = p.a * alphaMul;
      ctx.fillStyle = `hsla(${p.hue}, ${p.sat}%, ${p.lit}%, ${a})`;

      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      const s = p.size * p.depth;
      ctx.fillRect(-s * 0.5, -s * 0.5, s, s * 0.55);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    }
    ctx.restore();
  }

  function drawCrowdShake(t) {
    // small camera shake synced to "cheer hits"
    const hits = 4;
    const beat = Math.max(0, Math.sin(t * Math.PI * hits));
    const shake = beat * beat * 1.8; // px
    return { x: rand(-shake, shake), y: rand(-shake, shake) };
  }

  function drawEndFade(msFromEnd) {
    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const a = clamp(msFromEnd / fadeOutMs, 0, 1);
    ctx.fillStyle = `rgba(0,0,0,${a})`;
    ctx.fillRect(0, 0, vw, vh);
  }

  function complete() {
    document.body.classList.add("is-fading");

    const redirectUrl = cfg.redirectUrl;
    if (redirectUrl) {
      window.location.href = redirectUrl;
      return;
    }

    if (typeof window.startGame === "function") {
      window.startGame();
      return;
    }

    window.dispatchEvent(new CustomEvent("loadingComplete"));
  }

  // Easing + helpers
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
  function easeInOutQuad(t) { return t < 0.5 ? 2*t*t : 1 - Math.pow(-2*t + 2, 2) / 2; }

  let start = null;
  let last = null;
  let done = false;

  function frame(ts) {
    if (!start) { start = ts; last = ts; }
    const elapsed = ts - start;
    const dt = Math.min(0.05, (ts - last) / 1000);
    last = ts;

    const t = clamp(elapsed / durationMs, 0, 1);

    // Background
    const shakePx = drawCrowdShake(t);
    drawCoverImage(t, shakePx);

    // "Flag wave" ramps up mid-way then eases
    const waveIntensity = 0.15 + 0.85 * easeInOutQuad(clamp((t - 0.10) / 0.75, 0, 1));
    drawFlagWave(ts / 1000, waveIntensity);

    // Confetti – starts strong then settles
    const wind = lerp(10, 36, Math.sin(t * Math.PI));
    const gravity = 38;
    stepConfetti(dt, wind, gravity);
    drawConfetti(lerp(0.95, 0.55, t));

    // Light burst / stadium vibe
    drawLightBurst(t);

    // End fade
    const msFromEnd = elapsed - (durationMs - fadeOutMs);
    if (msFromEnd > 0) drawEndFade(msFromEnd);

    if (!done && elapsed >= durationMs) {
      done = true;
      complete();
      return; // stop loop
    }

    requestAnimationFrame(frame);
  }

  img.onload = () => {
    resize();
    initConfetti();
    requestAnimationFrame(frame);
  };

  img.onerror = (e) => {
    console.error("Failed to load image:", e);
    // Fail open: still complete so you don't get stuck
    setTimeout(complete, 500);
  };
})();