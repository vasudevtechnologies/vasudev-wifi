'use client';

import { useEffect, useRef } from 'react';
import styles from './page.module.css';

const TOTAL_FRAMES = 240;
const frameSrc = (n) => `/frames/ezgif-frame-${String(n).padStart(3, '0')}.jpg`;

const SECTIONS = [
  { id: 's1', start: 0.00, end: 0.13, label: '01 / 06' },
  { id: 's2', start: 0.13, end: 0.28, label: '02 / 06' },
  { id: 's3', start: 0.28, end: 0.45, label: '03 / 06' },
  { id: 's4', start: 0.45, end: 0.63, label: '04 / 06' },
  { id: 's5', start: 0.63, end: 0.80, label: '05 / 06' },
  { id: 's6', start: 0.80, end: 1.00, label: '06 / 06' },
];

export default function Home() {
  const canvasRef = useRef(null);
  const particleRef = useRef(null);
  const energyRef = useRef(null);
  const loadedRef = useRef(0);
  const imgsRef = useRef([]);
  const curFrameRef = useRef(0);
  const tgtFrameRef = useRef(0);
  const progressRef = useRef(0);
  const iotRunningRef = useRef(false);
  const iotTimerRef = useRef(null);
  const particlesRef = useRef([]);
  const elinesRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const pcvs = particleRef.current;
    const ecvs = energyRef.current;
    if (!canvas || !pcvs || !ecvs) return;

    const ctx = canvas.getContext('2d');
    const pctx = pcvs.getContext('2d');
    const ectx = ecvs.getContext('2d');

    // ── LOGICAL DIMENSIONS (DPR-aware) ──
    // We track logical px separately; canvas buffers = logical × DPR for crispness
    let logW = window.innerWidth;
    let logH = window.innerHeight;

    // ── RESIZE ──
    function resize() {
      const dpr = window.devicePixelRatio || 1;
      logW = window.innerWidth;
      logH = window.innerHeight;

      // Set canvas BUFFER size to physical pixels
      [canvas, pcvs, ecvs].forEach((c) => {
        c.width  = Math.round(logW * dpr);
        c.height = Math.round(logH * dpr);
        // CSS size stays logical (100% handled by CSS class)
        c.style.width  = logW + 'px';
        c.style.height = logH + 'px';
      });

      // Scale contexts so all draw calls use LOGICAL coordinates
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      pctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ectx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Maximum image quality when scaling
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      pctx.imageSmoothingEnabled = true;
      ectx.imageSmoothingEnabled = true;

      initELines();
    }
    resize();
    window.addEventListener('resize', resize);

    // ── PARTICLES ──
    function initParticles() {
      particlesRef.current = [];
      for (let i = 0; i < 90; i++) {
        particlesRef.current.push({
          x: Math.random() * logW, y: Math.random() * logH,  // logical coords
          r: Math.random() * 1.4 + 0.3,
          op: Math.random() * 0.45 + 0.08,
          vx: (Math.random() - 0.5) * 0.28,
          vy: (Math.random() - 0.5) * 0.28,
          col: Math.random() > 0.5 ? '122,0,255' : '0,214,255',
        });
      }
    }

    function drawParticles(alpha) {
      pctx.clearRect(0, 0, logW, logH);  // logical coords
      if (alpha <= 0) return;
      particlesRef.current.forEach((p) => {
        p.x = (p.x + p.vx + logW) % logW;  // wrap at logical boundary
        p.y = (p.y + p.vy + logH) % logH;
        pctx.beginPath();
        pctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        pctx.fillStyle = `rgba(${p.col},${p.op * alpha})`;
        pctx.fill();
      });
    }

    // ── ENERGY LINES ──
    function initELines() {
      elinesRef.current = [];
      const cx = logW / 2, cy = logH / 2;  // logical center
      const eps = [
        { x: cx - 190, y: cy - 130 }, { x: cx + 190, y: cy - 90 },
        { x: cx - 210, y: cy + 70 }, { x: cx + 170, y: cy + 110 },
        { x: cx, y: cy - 170 }, { x: cx - 110, y: cy + 150 },
        { x: cx + 80, y: cy - 60 }, { x: cx - 70, y: cy + 60 },
      ];
      eps.forEach((ep) => elinesRef.current.push({
        x1: cx, y1: cy, x2: ep.x, y2: ep.y,
        t: Math.random(), spd: 0.007 + Math.random() * 0.011,
        col: Math.random() > 0.5 ? '122,0,255' : '0,214,255',
      }));
    }

    function drawELines() {
      ectx.clearRect(0, 0, logW, logH);  // logical coords
      elinesRef.current.forEach((l) => {
        l.t = (l.t + l.spd) % 1;
        const px = l.x1 + (l.x2 - l.x1) * l.t;
        const py = l.y1 + (l.y2 - l.y1) * l.t;
        const g = ectx.createLinearGradient(l.x1, l.y1, l.x2, l.y2);
        const b = Math.max(0, l.t - 0.12), c = Math.min(1, l.t + 0.12);
        g.addColorStop(0, `rgba(${l.col},0)`);
        g.addColorStop(b, `rgba(${l.col},0)`);
        g.addColorStop(l.t, `rgba(${l.col},0.65)`);
        g.addColorStop(Math.min(c, 1), `rgba(${l.col},0)`);
        g.addColorStop(1, `rgba(${l.col},0)`);
        ectx.beginPath(); ectx.moveTo(l.x1, l.y1); ectx.lineTo(l.x2, l.y2);
        ectx.strokeStyle = g; ectx.lineWidth = 1; ectx.stroke();
        // FIX: only draw dot when NOT near center origin (t > 0.20) and not near endpoint (t < 0.88)
        if (l.t > 0.20 && l.t < 0.88) {
          ectx.beginPath(); ectx.arc(px, py, 2.2, 0, Math.PI * 2);
          ectx.fillStyle = `rgba(${l.col},1)`; ectx.fill();
          ectx.beginPath(); ectx.arc(px, py, 6, 0, Math.PI * 2);
          ectx.fillStyle = `rgba(${l.col},0.18)`; ectx.fill();
        }
      });
    }

    // ── FRAME DRAW ──
    function drawFrame(idx) {
      const img = imgsRef.current[idx];
      if (!img || !img.complete || !img.naturalWidth) return;
      // Use LOGICAL dimensions — ctx is already scaled by DPR via setTransform
      const sc = Math.max(logW / img.naturalWidth, logH / img.naturalHeight);
      const dW = img.naturalWidth * sc, dH = img.naturalHeight * sc;
      ctx.clearRect(0, 0, logW, logH);
      ctx.drawImage(img, (logW - dW) / 2, (logH - dH) / 2, dW, dH);
    }

    // ── PRELOADER ──
    const bar = document.getElementById('ld-bar');
    const pct = document.getElementById('ld-pct');
    const stat = document.getElementById('ld-status');
    const statuses = [
      'Initializing render pipeline...',
      'Loading product geometry...',
      'Calibrating lighting systems...',
      'Preparing animation sequences...',
      'Optimizing frame buffer...',
      'Launching experience...',
    ];

    imgsRef.current = new Array(TOTAL_FRAMES);

    function onDone() {
      loadedRef.current++;
      const p = (loadedRef.current / TOTAL_FRAMES) * 100;
      if (bar) bar.style.width = p.toFixed(1) + '%';
      if (pct) pct.textContent = Math.round(p) + '%';
      if (stat) stat.textContent = statuses[Math.min(Math.floor(p / 17), 5)];
      if (loadedRef.current >= TOTAL_FRAMES) launch();
    }

    for (let i = 0; i < TOTAL_FRAMES; i++) {
      const img = new Image();
      img.onload = onDone;
      img.onerror = onDone;
      imgsRef.current[i] = img;
      img.src = frameSrc(i + 1);
    }

    // Safety timeout
    setTimeout(() => {
      if (loadedRef.current < TOTAL_FRAMES) launch();
    }, 15000);

    // ── LAUNCH ──
    // DOM element cache (populated once — zero getElementById in the hot rAF loop)
    let elNav, elPb, elSecNum, elCl3, elCl4, elEcvs, elIot, elSecs;
    let elBattBar, elWifiBar, elPowerBar;

    function launch() {
      setTimeout(() => {
        const loader = document.getElementById('loader');
        if (loader) loader.style.opacity = '0';
        setTimeout(() => { if (loader) loader.style.display = 'none'; }, 900);

        // ── Cache ALL DOM elements once here — never query again in the loop ──
        elNav      = document.getElementById('main-nav');
        elPb       = document.getElementById('progress-bar');
        elSecNum   = document.getElementById('sec-num');
        elCl3      = document.getElementById('cl3');
        elCl4      = document.getElementById('cl4');
        elEcvs     = document.getElementById('c-energy');
        elIot      = document.getElementById('iot');
        elSecs     = SECTIONS.map(s => document.getElementById(s.id));
        elBattBar  = document.getElementById('d-batt-bar');
        elWifiBar  = document.getElementById('d-wifi-bar');
        elPowerBar = document.getElementById('d-power-bar');

        if (elNav) elNav.style.transform = 'translateY(0)';
        initParticles();
        initELines();
        drawFrame(0);
        startLoop();
      }, 500);
    }

    // ── SMOOTH SCROLL STATE ──
    // Double-lerp: rawScrollY → smoothScrollY (lerp 1) → curFrame (lerp 2)
    // Result: buttery cinema-quality scroll with zero lag
    let rawScrollY    = 0;   // actual scroll position (updated on scroll event)
    let smoothScrollY = 0;   // lerped scroll position (drives all animation)
    let cachedMaxY    = 0;   // cached to avoid reflow every frame

    function updateCachedMaxY() {
      const wrap = document.getElementById('scroll-wrap');
      cachedMaxY = wrap ? wrap.offsetHeight - window.innerHeight : 1;
    }
    updateCachedMaxY();
    window.addEventListener('resize', updateCachedMaxY);

    // ── MAIN LOOP ── (performance-optimised: skips work when nothing changes)
    let rafId;
    let lastDrawnFrame = -1; // skip drawFrame when frame index unchanged
    let lastProg = -1;       // skip updateSections when scroll is stable

    function startLoop() {
      function loop() {
        rafId = requestAnimationFrame(loop);

        // LERP 1: smooth scroll
        smoothScrollY += (rawScrollY - smoothScrollY) * 0.075;

        const prog = cachedMaxY > 0
          ? Math.min(Math.max(smoothScrollY / cachedMaxY, 0), 1) : 0;

        // Progress bar — raw pos for instant visual feedback, no lag
        if (elPb) {
          const rp = cachedMaxY > 0
            ? Math.min(Math.max(rawScrollY / cachedMaxY, 0), 1) : 0;
          elPb.style.width = (rp * 100).toFixed(2) + '%';
        }

        // LERP 2: frame interpolation
        tgtFrameRef.current = Math.round(prog * (TOTAL_FRAMES - 1));
        curFrameRef.current += (tgtFrameRef.current - curFrameRef.current) * 0.14;
        const frameIdx = Math.round(curFrameRef.current);

        // ★ Skip canvas redraw when frame index hasn’t changed — biggest perf win
        if (frameIdx !== lastDrawnFrame) {
          drawFrame(frameIdx);
          lastDrawnFrame = frameIdx;
        }

        // Energy lines (only when the canvas is active)
        if (elEcvs && elEcvs.dataset.active === '1') drawELines();

        // ★ Skip section DOM updates when progress is stable (idle at page end)
        if (Math.abs(prog - lastProg) > 0.0004) {
          lastProg = prog;
          updateSections(prog);
        }

        // Particles — skip entirely when fully faded (no clearRect overhead)
        const pAlpha = Math.max(0, 1 - prog / 0.06);
        if (pAlpha > 0) drawParticles(pAlpha);
      }
      loop();
    }

    // ── SCROLL ── (captures raw pos only — no DOM reads)
    function onScroll() {
      rawScrollY = window.scrollY;
      if (elNav) elNav.classList.toggle('scrolled', rawScrollY > 50);
    }

    function updateSections(prog) {
      // Use cached elSecs — zero getElementById calls
      let activeIdx = 0;
      elSecs.forEach((el, i) => {
        const on = prog >= SECTIONS[i].start && prog < SECTIONS[i].end;
        if (el) el.style.opacity = on ? '1' : '0';
        if (on) activeIdx = i;
      });
      if (elSecNum) elSecNum.textContent = SECTIONS[activeIdx].label;

      // Component labels
      const s3on = prog >= SECTIONS[2].start + 0.04 && prog < SECTIONS[2].end;
      const s4on = prog >= SECTIONS[3].start + 0.04 && prog < SECTIONS[3].end;
      if (elCl3) elCl3.style.opacity = s3on ? '1' : '0';
      if (elCl4) elCl4.style.opacity = s4on ? '1' : '0';

      // Energy lines
      const eOn = prog >= SECTIONS[2].start && prog < SECTIONS[4].start;
      if (elEcvs) {
        elEcvs.dataset.active = eOn ? '1' : '0';
        elEcvs.style.opacity  = eOn ? '1' : '0';
      }

      // IoT dashboard
      const iotOn = prog >= SECTIONS[4].start && prog < SECTIONS[4].end;
      if (elIot) {
        elIot.style.opacity   = iotOn ? '1' : '0';
        elIot.style.transform = iotOn
          ? 'translateY(-50%) translateX(0)'
          : 'translateY(-50%) translateX(24px)';
      }
      if (iotOn) startIoT(); else stopIoT();
      // Note: particles are drawn in the loop with an alpha guard — not here
    }

    // ── IoT ──
    function startIoT() {
      if (iotRunningRef.current) return;
      iotRunningRef.current = true;
      // Bar elements cached in launch() as elBattBar, elWifiBar, elPowerBar
      setTimeout(() => {
        if (elBattBar)  elBattBar.style.width  = '87%';
        if (elWifiBar)  elWifiBar.style.width   = '72%';
        if (elPowerBar) elPowerBar.style.width  = '58%';
      }, 300);
      // Cache read-out elements once for the interval
      const elDbatt = document.getElementById('d-batt');
      const elDvolt = document.getElementById('d-volt');
      const elDtemp = document.getElementById('d-temp');
      const elDback = document.getElementById('d-backup');
      iotTimerRef.current = setInterval(() => {
        const b = (84 + Math.random() * 5).toFixed(0);
        const v = (12.3 + Math.random() * 0.5).toFixed(1);
        const t = (35  + Math.random() * 5).toFixed(0);
        const m = 248  + Math.round(Math.random() * 14);
        if (elDbatt) elDbatt.textContent = b + '%';
        if (elDvolt) elDvolt.textContent = v + 'V';
        if (elDtemp) elDtemp.textContent = t + '°C';
        if (elDback) elDback.textContent = `${Math.floor(m/60)}h ${String(m%60).padStart(2,'0')}m`;
      }, 1800);
    }

    function stopIoT() {
      if (!iotRunningRef.current) return;
      iotRunningRef.current = false;
      clearInterval(iotTimerRef.current);
      if (elBattBar)  elBattBar.style.width  = '0%';
      if (elWifiBar)  elWifiBar.style.width   = '0%';
      if (elPowerBar) elPowerBar.style.width  = '0%';
    }

    // ── CURSOR ──
    const cur = document.getElementById('cur');
    const curR = document.getElementById('cur-ring');
    let mx = -100, my = -100, rx = -100, ry = -100;
    if (cur) cur.style.opacity = '0';
    if (curR) curR.style.opacity = '0';

    function onMouseMove(e) {
      if (cur && cur.style.opacity === '0') { cur.style.opacity = '1'; curR.style.opacity = '1'; }
      mx = e.clientX; my = e.clientY;
      if (cur) { cur.style.left = mx + 'px'; cur.style.top = my + 'px'; }
    }

    function curLoop() {
      requestAnimationFrame(curLoop);
      rx += (mx - rx) * 0.11; ry += (my - ry) * 0.11;
      if (curR) { curR.style.left = rx + 'px'; curR.style.top = ry + 'px'; }
    }
    curLoop();

    document.querySelectorAll('a,button').forEach((el) => {
      el.addEventListener('mouseenter', () => { if (cur) cur.classList.add('hov'); if (curR) curR.classList.add('hov'); });
      el.addEventListener('mouseleave', () => { if (cur) cur.classList.remove('hov'); if (curR) curR.classList.remove('hov'); });
    });

    // ── NAV SCROLL ──
    function scrollToSection(idx) {
      // Use cachedMaxY to avoid reflow
      window.scrollTo({ top: SECTIONS[idx].start * cachedMaxY, behavior: 'smooth' });
    }

    const navLinks = {
      'nl-1': 0, 'nl-2': 1, 'nl-3': 2, 'nl-4': 4, 'nl-5': 3,
    };
    Object.entries(navLinks).forEach(([id, idx]) => {
      const el = document.getElementById(id);
      if (el) el.addEventListener('click', (e) => { e.preventDefault(); scrollToSection(idx); });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') window.scrollTo({ top: 0, behavior: 'smooth' });
    });

    window.addEventListener('scroll', onScroll, { passive: true });
    document.addEventListener('mousemove', onMouseMove);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('resize', updateCachedMaxY);
      window.removeEventListener('scroll', onScroll);
      document.removeEventListener('mousemove', onMouseMove);
      if (rafId) cancelAnimationFrame(rafId);
      if (iotTimerRef.current) clearInterval(iotTimerRef.current);
    };
  }, []);

  return (
    <>
      {/* Custom Cursor */}
      <div id="cur" className={styles.cur}></div>
      <div id="cur-ring" className={styles.curRing}></div>

      {/* Progress Bar */}
      <div id="progress-bar" className={styles.progressBar}></div>

      {/* LOADER */}
      <div id="loader" className={styles.loader}>
        <div className={styles.ldEyebrow}>Vasudev Technologies</div>
        <div className={styles.ldTitle}>WiFi Router Battery<br />Backup System</div>
        <div className={styles.ldBarWrap}>
          <div id="ld-bar" className={styles.ldBar}></div>
        </div>
        <div id="ld-pct" className={styles.ldPct}>0%</div>
        <div id="ld-status" className={styles.ldStatus}>Initializing experience...</div>
      </div>

      {/* NAVBAR */}
      <nav id="main-nav" className={styles.nav}>
        <a href="#" className={styles.navLogo}>Vasudev<em className={styles.dot}>.</em></a>
        <ul className={styles.navLinks}>
          <li><a id="nl-1" href="#">Overview</a></li>
          <li><a id="nl-2" href="#">Technology</a></li>
          <li><a id="nl-3" href="#">Architecture</a></li>
          <li><a id="nl-4" href="#">IoT Monitoring</a></li>
          <li><a id="nl-5" href="#">Protection</a></li>
          <li><a href="#cta">Experience</a></li>
        </ul>
        <a href="#cta" className={styles.navBtn}>Get Started</a>
      </nav>

      {/* SCROLL AREA */}
      <div id="scroll-wrap" className={styles.scrollWrap}>
        <div className={styles.sticky}>
          {/* Canvases */}
          <canvas ref={canvasRef} className={styles.cProduct} />
          <canvas id="c-energy" ref={energyRef} className={styles.cEnergy} />
          <canvas ref={particleRef} className={styles.cParticles} />

          {/* Overlays */}
          <div className={styles.vignette}></div>
          <div className={styles.chroma}></div>

          {/* S1 — HERO */}
          <div id="s1" className={`${styles.overlay} ${styles.s1}`}>
            <div className={styles.heroBrand}>Vasudev Technologies — Est. 2024</div>
            <div className={styles.heroName}>WiFi Router Battery Backup System</div>
            <div className={styles.heroBig}>Power Never<br />Stops.</div>
            <div className={styles.heroTag}>Next-Generation Smart IoT Connectivity</div>
            <div className={styles.scrollCue}>
              <span>Scroll to explore</span>
              <div className={styles.scrollLine}></div>
            </div>
          </div>

          {/* S2 — OPENING */}
          <div id="s2" className={`${styles.overlay} ${styles.sBl}`}>
            <div className={styles.tag}>02 — Architecture</div>
            <div className={styles.headline}>Engineered For<br /><span className={styles.hl}>Continuous</span><br />Connectivity.</div>
            <div className={styles.sub}>Precision-engineered mechanical architecture opens to reveal the intelligent power systems within.</div>
          </div>

          {/* S3 — INTERNAL */}
          <div id="s3" className={`${styles.overlay} ${styles.sBl}`}>
            <div className={styles.tag}>03 — Intelligence</div>
            <div className={styles.headline}>Intelligent<br /><span className={styles.hl}>Backup</span><br />Architecture.</div>
            <div className={styles.sub}>ESP32 neural core, TP4056 precision charging, XL6009 boost conversion — engineered in perfect harmony.</div>
          </div>

          {/* S3 Labels — Internal Reveal: Apple-style spec callouts */}
          <div id="cl3" className={styles.compLabels}>

            {/* ─── LEFT SIDE: text box → arm → dot (pointing inward right) ─── */}
            <div className={styles.callout} style={{top:'24%',left:'2vw',animationDelay:'0s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>ESP32 Neural Core</div>
                <div className={styles.calloutSpec}>240MHz Dual-Core MCU</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={styles.callout} style={{top:'42%',left:'2vw',animationDelay:'0.1s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Smart Protection PCB</div>
                <div className={styles.calloutSpec}>Overload + Thermal Guard</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={styles.callout} style={{top:'60%',left:'2vw',animationDelay:'0.2s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Li-Ion Battery Array</div>
                <div className={styles.calloutSpec}>10,000mAh — 3.7V Cells</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            {/* ─── RIGHT SIDE: dot → arm → text box (pointing inward left) ─── */}
            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'30%',right:'2vw',animationDelay:'0.05s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>TP4056 Charging IC</div>
                <div className={styles.calloutSpec}>1A Precision Fast Charge</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'50%',right:'2vw',animationDelay:'0.15s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>XL6009 Boost Converter</div>
                <div className={styles.calloutSpec}>4V – 38V Output Range</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'67%',right:'2vw',animationDelay:'0.25s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Copper Power Bus</div>
                <div className={styles.calloutSpec}>Low-Loss Interconnect</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

          </div>

          {/* S4 — EXPLODED */}
          <div id="s4" className={`${styles.overlay} ${styles.sBl}`}>
            <div className={styles.tag}>04 — Engineering</div>
            <div className={styles.headline}>Designed<br />With<br /><span className={styles.hl}>Precision.</span></div>
            <div className={styles.sub}>Every component individually calibrated — suspended in engineering elegance.</div>
          </div>

          {/* S4 Labels — Exploded View: Apple-style spec callouts */}
          <div id="cl4" className={styles.compLabels}>

            {/* ─── LEFT SIDE ─── */}
            <div className={styles.callout} style={{top:'13%',left:'2vw',animationDelay:'0s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Cooling Architecture</div>
                <div className={styles.calloutSpec}>Thermal Dissipation Layer</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={styles.callout} style={{top:'30%',left:'2vw',animationDelay:'0.1s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Smart Protection PCB</div>
                <div className={styles.calloutSpec}>Multi-Layer Safety Circuit</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={styles.callout} style={{top:'50%',left:'2vw',animationDelay:'0.2s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Power Distribution</div>
                <div className={styles.calloutSpec}>12V Regulated Bus System</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={styles.callout} style={{top:'68%',left:'2vw',animationDelay:'0.3s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>OLED Display Circuit</div>
                <div className={styles.calloutSpec}>0.96" SSD1306 Driver</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            {/* ─── RIGHT SIDE ─── */}
            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'18%',right:'2vw',animationDelay:'0.05s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>IoT Module — ESP32</div>
                <div className={styles.calloutSpec}>WiFi + BT Smart Controller</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'38%',right:'2vw',animationDelay:'0.15s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Battery Cell Array</div>
                <div className={styles.calloutSpec}>18650 Li-Ion — 2600mAh ×4</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

            <div className={`${styles.callout} ${styles.calloutR}`} style={{top:'58%',right:'2vw',animationDelay:'0.25s'}}>
              <div className={styles.calloutBox}>
                <div className={styles.calloutName}>Converter Modules</div>
                <div className={styles.calloutSpec}>Buck + Boost Dual Stage</div>
              </div>
              <div className={styles.calloutArm}></div>
              <div className={styles.calloutDot}></div>
            </div>

          </div>

          {/* S5 — IoT */}
          <div id="s5" className={`${styles.overlay} ${styles.sLeft}`}>
            <div className={styles.tag}>05 — IoT Intelligence</div>
            <div className={styles.headline}>Monitor<br />Everything<br /><span className={styles.hl}>In Real Time.</span></div>
            <div className={styles.sub}>Complete system visibility. Battery health, power flow, WiFi strength — all from one dashboard.</div>
          </div>

          {/* IoT Dashboard */}
          <div id="iot" className={styles.iot}>
            <div className={styles.dashHead}>
              <div className={styles.dashTitle}>System Monitor</div>
              <div className={styles.liveDotWrap}><div className={styles.liveDot}></div><span>Live</span></div>
            </div>
            <div className={styles.dashMetric}>
              <div className={styles.mRow}><span className={styles.mLabel}>Battery Charge</span><span id="d-batt" className={`${styles.mVal} ${styles.mP}`}>87%</span></div>
              <div className={styles.mBar}><div id="d-batt-bar" className={`${styles.mFill} ${styles.mFP}`}></div></div>
            </div>
            <div className={styles.dashMetric}>
              <div className={styles.mRow}><span className={styles.mLabel}>WiFi Signal</span><span id="d-wifi" className={`${styles.mVal} ${styles.mB}`}>−42 dBm</span></div>
              <div className={styles.mBar}><div id="d-wifi-bar" className={`${styles.mFill} ${styles.mFB}`}></div></div>
            </div>
            <div className={styles.dashMetric}>
              <div className={styles.mRow}><span className={styles.mLabel}>Output Power</span><span id="d-power" className={`${styles.mVal} ${styles.mG}`}>12.4W</span></div>
              <div className={styles.mBar}><div id="d-power-bar" className={`${styles.mFill} ${styles.mFG}`}></div></div>
            </div>
            <div className={styles.dashGrid}>
              <div className={styles.dgItem}><div className={styles.dgIcon}>⚡</div><div id="d-volt" className={styles.dgVal}>12.6V</div><div className={styles.dgLabel}>Voltage</div></div>
              <div className={styles.dgItem}><div className={styles.dgIcon}>🌡</div><div id="d-temp" className={styles.dgVal}>38°C</div><div className={styles.dgLabel}>Temp</div></div>
              <div className={styles.dgItem}><div className={styles.dgIcon}>📶</div><div className={styles.dgVal}>5GHz</div><div className={styles.dgLabel}>Band</div></div>
              <div className={styles.dgItem}><div className={styles.dgIcon}>🔋</div><div id="d-backup" className={styles.dgVal}>4h 12m</div><div className={styles.dgLabel}>Backup</div></div>
            </div>
          </div>

          {/* S6 — FINAL */}
          <div id="s6" className={`${styles.overlay} ${styles.sBc}`}>
            <div className={styles.tag}>06 — Experience</div>
            <div className={styles.headline}>Never Lose<br /><span className={styles.hl}>Connection.</span></div>
            <div className={styles.sub}>Stay Powered. Stay Connected. Stay Ahead.</div>
            <a href="#cta" className={styles.ctaBtn} style={{marginTop:'28px',pointerEvents:'all'}}>Experience The Future →</a>
          </div>

          {/* Section counter */}
          <div id="sec-num" className={styles.secNum}>01 / 06</div>
        </div>
      </div>

      {/* FINAL CTA */}
      <section id="cta" className={styles.cta}>
        <div className={styles.ctaGlow}></div>
        <div className={styles.ctaEyebrow}>Vasudev Technologies — 2025</div>
        <h1 className={styles.ctaH1}>Power.<br />Intelligence.<br />Infinity.</h1>
        <p className={styles.ctaSub}>Stay Powered. Stay Connected.</p>
        <a href="#" className={styles.ctaBtn}>Experience The Future →</a>
        <div className={styles.specs}>
          <div className={styles.spec}><div className={styles.specV}>10Ah</div><div className={styles.specL}>Battery Capacity</div></div>
          <div className={styles.spec}><div className={styles.specV}>12V</div><div className={styles.specL}>Boost Output</div></div>
          <div className={styles.spec}><div className={styles.specV}>8h+</div><div className={styles.specL}>Backup Time</div></div>
          <div className={styles.spec}><div className={styles.specV}>ESP32</div><div className={styles.specL}>Smart Core</div></div>
          <div className={styles.spec}><div className={styles.specV}>360°</div><div className={styles.specL}>IoT Monitoring</div></div>
        </div>
        <div className={styles.ctaDivider}></div>
        <div className={styles.footerRow}>
          <div className={styles.footerBrand}>Vasudev<em className={styles.dot}>.</em>Technologies</div>
          <div className={styles.footerCopy}>© 2025 Vasudev Technologies. All rights reserved.</div>
        </div>
      </section>
    </>
  );
}
