const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
const lum = (h) => { const p = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)); return 0.2126 * lin(p[0]) + 0.7152 * lin(p[1]) + 0.0722 * lin(p[2]); };
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((m, n) => n - m); return (x + 0.05) / (y + 0.05); };
const mix = (a, b, t) => { const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)); const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16)); return "#" + pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, "0")).join(""); };

const EYE = "#A9C5B4";
// darker weather targets: overcast DULLS a sky, it doesn't backlight it
const W = { cloudy: ["#454E4A", 0.35], rain: ["#333F46", 0.35], snow: ["#46525A", 0.25] };
for (const set of [
  { name: "ORIGINAL", vals: { spring: "#315C44", summer: "#2E5540", autumn: "#574832", winter: "#365060" } },
  { name: "DARKENED", vals: { spring: "#27503A", summer: "#264A37", autumn: "#4A3D2A", winter: "#2E4753" } },
]) {
  console.log("--- " + set.name);
  for (const [s, day] of Object.entries(set.vals)) {
    const mixes = { raw: day, cloudy: mix(day, ...W.cloudy), rain: mix(day, ...W.rain), snow: mix(day, ...W.snow) };
    const line = Object.entries(mixes).map(([k, c]) => `${k}=${ratio(EYE, c).toFixed(2)}`).join(" ");
    console.log(s.padEnd(8), line, Object.values(mixes).every((c) => ratio(EYE, c) >= 4.5) ? "PASS" : "FAIL");
  }
}
