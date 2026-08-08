/**
 * Sky-vs-text WCAG verifier for the living sky.
 * The header has TWO text regimes: dark ink on the light day sky
 * (blend < 0.5) and cream/#A9C5B4 on the dark evening sky (>= 0.5).
 * This sweeps every season x weather x blend sample in both regimes and
 * fails loudly if any combination drops below 4.5:1.
 * Run: node tools/contrast-check.mjs
 */
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (h) => { const p = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => { t = Math.max(0, Math.min(1, t)); const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)); const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join(""); };
const mix3 = (a, b, c, t) => (t <= 1 ? mix(a, b, t) : mix(b, c, t - 1));

// ── keep in sync with src/lib/sky.ts SEASON_SPECS + weather targets ──
const INK = "#14281C";
const EYE = "#A9C5B4";
const SPECS = {
  spring: { skyDay: "#A7CBB0", skyGold: "#8FB183", skyDuskWarm: "#2C5138", skyDusk: "#244831", skyNight: "#0D1B13" },
  summer: { skyDay: "#9CC3A8", skyGold: "#85A87E", skyDuskWarm: "#284A33", skyDusk: "#1E4232", skyNight: "#0A1710" },
  autumn: { skyDay: "#C9B891", skyGold: "#B59A6B", skyDuskWarm: "#4A3A20", skyDusk: "#453522", skyNight: "#150F08" },
  winter: { skyDay: "#A7BECB", skyGold: "#8FA5AC", skyDuskWarm: "#2E4450", skyDusk: "#293A44", skyNight: "#0C1319" },
};
const W_LIGHT = { clear: null, cloudy: ["#9AA29C", 0.35], rain: ["#8C9AA1", 0.35], snow: ["#AAB4BA", 0.25] };
const W_DARK = { clear: null, cloudy: ["#454E4A", 0.35], rain: ["#333F46", 0.35], snow: ["#46525A", 0.25] };

let worst = { r: Infinity, at: "" };
let pass = true;
for (const [season, s] of Object.entries(SPECS)) {
  // light regime: ink text, blend 0 → 0.49
  for (const b of [0, 0.13, 0.25, 0.37, 0.49]) {
    const base = mix(s.skyDay, s.skyGold, b * 2);
    for (const [w, m] of Object.entries(W_LIGHT)) {
      const sky = m ? mix(base, m[0], m[1]) : base;
      const r = ratio(INK, sky);
      if (r < worst.r) worst = { r, at: `${season} light b=${b} ${w}` };
      if (r < 4.5) { pass = false; console.log(`FAIL ink ${season} b=${b} ${w}: ${r.toFixed(2)}`); }
    }
  }
  // dark regime: #A9C5B4 eyebrows, blend 0.5 → 2
  for (const b of [0.5, 0.65, 0.85, 1, 1.3, 1.6, 2]) {
    const base = mix3(s.skyDuskWarm, s.skyDusk, s.skyNight, ((b - 0.5) * 4) / 3);
    for (const [w, m] of Object.entries(W_DARK)) {
      const sky = m ? mix(base, m[0], m[1]) : base;
      const r = ratio(EYE, sky);
      if (r < worst.r) worst = { r, at: `${season} dark b=${b} ${w}` };
      if (r < 4.5) { pass = false; console.log(`FAIL eyebrow ${season} b=${b} ${w}: ${r.toFixed(2)}`); }
    }
  }
}
console.log(pass ? `ALL PASS — worst ${worst.r.toFixed(2)}:1 at ${worst.at}` : "FAILURES ABOVE");
process.exit(pass ? 0 : 1);
