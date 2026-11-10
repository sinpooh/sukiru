// スキる 原っぱBGM — a looping chiptune made in code (no music file). Shared by the preview page and the app.
(function () {
  const BPM = 140, E = 60 / BPM / 2; // one eighth note in seconds
  const _ = "-";
  // 16 bars, 8 eighth-note slots each. number = new note (MIDI), "-" = hold, 0 = rest
  const MEL = [
    [72,_,76,_,79,_,76,79], [81,_,79,_,74,_,71,74], [76,_,72,_,69,_,72,76], [77,_,_,76,74,_,72,_],
    [72,_,76,_,79,_,84,_], [83,_,81,79,_,_,74,_], [77,_,81,_,79,_,77,76], [74,_,_,_,79,_,71,_],
    [81,_,84,_,81,79,76,_], [77,_,81,_,84,_,81,_], [79,_,76,_,72,_,76,79], [79,_,83,_,86,_,83,_],
    [84,_,83,81,_,79,76,_], [77,_,79,81,_,84,_,81], [79,_,81,_,83,_,86,_], [86,_,_,_,83,_,79,_]
  ];
  // chord per bar: [bass root, triad]
  const C = [48, [60, 64, 67]], G = [43, [59, 62, 67]], Am = [45, [60, 64, 69]], F = [41, [60, 65, 69]];
  const CH = [C, G, Am, F, C, G, F, G, Am, F, C, G, Am, F, G, G];
  const hz = n => 440 * Math.pow(2, (n - 69) / 12);

  let ctx = null, out = null, timer = null, step = 0, next = 0, noise = null;
  function note(f, t, d, type, vol) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(f, t);
    g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(vol, t + 0.01);
    g.gain.setValueAtTime(vol, t + Math.max(0.02, d - 0.05)); g.gain.linearRampToValueAtTime(0, t + d);
    o.connect(g).connect(out); o.start(t); o.stop(t + d + 0.02);
  }
  function hit(t, d, vol, hp) {
    const s = ctx.createBufferSource(), g = ctx.createGain(), f = ctx.createBiquadFilter();
    s.buffer = noise; f.type = "highpass"; f.frequency.value = hp;
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.001, t + d);
    s.connect(f).connect(g).connect(out); s.start(t); s.stop(t + d + 0.02);
  }
  function kick(t) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.frequency.setValueAtTime(150, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
    g.gain.setValueAtTime(0.5, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    o.connect(g).connect(out); o.start(t); o.stop(t + 0.2);
  }
  function schedule(i, t) {
    const bar = Math.floor(i / 8) % 16, s = i % 8, m = MEL[bar], [root, tri] = CH[bar];
    // melody
    if (typeof m[s] === "number" && m[s]) {
      let len = 1; while (s + len < 8 && m[s + len] === _) len++;
      note(hz(m[s]), t, len * E * 0.95, "square", 0.075);
      note(hz(m[s] + 12), t, len * E * 0.9, "sine", 0.025); // sparkle on top
    }
    // bouncing bass: root / octave
    note(hz(s % 2 ? root + 12 : root), t, E * 0.8, "triangle", 0.22);
    // off-beat chord stabs
    if (s % 2) tri.forEach(n => note(hz(n), t, E * 0.45, "square", 0.022));
    // drums
    if (s === 0 || s === 4) kick(t);
    if (s === 2 || s === 6) hit(t, 0.12, 0.16, 1500);
    hit(t, 0.04, 0.05, 7000);
  }
  function tick() {
    while (next < ctx.currentTime + 0.25) { schedule(step, next); step++; next += E; }
  }
  window.SkiruBGM = {
    get playing() { return !!timer; },
    start(c) {
      if (timer) return;
      ctx = c || ctx || new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === "suspended") ctx.resume();
      if (!noise) {
        noise = ctx.createBuffer(1, ctx.sampleRate * 0.3, ctx.sampleRate);
        const d = noise.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1;
      }
      out = ctx.createGain(); out.connect(ctx.destination);
      out.gain.setValueAtTime(0, ctx.currentTime); out.gain.linearRampToValueAtTime(0.55, ctx.currentTime + 0.8);
      step = 0; next = ctx.currentTime + 0.1;
      tick(); timer = setInterval(tick, 50);
    },
    stop() {
      if (!timer) return;
      clearInterval(timer); timer = null;
      const o = out, t = ctx.currentTime;
      o.gain.cancelScheduledValues(t); o.gain.setValueAtTime(o.gain.value, t); o.gain.linearRampToValueAtTime(0, t + 0.4);
      setTimeout(() => { try { o.disconnect(); } catch (e) {} }, 600);
    }
  };
})();
