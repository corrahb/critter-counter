/**
 * Renders the app icons from an inline SVG: the five-bar-gate tally
 * (the app's signature element) in blossom on moss. Run once with
 * `node scripts/make-icons.mjs`; the PNGs are committed so CI never
 * needs sharp.
 */
import sharp from "sharp";
import { mkdirSync } from "node:fs";

mkdirSync("public/icons", { recursive: true });

/** scale < 1 shrinks the tally toward the centre (maskable safe zone). */
const svg = (scale) => {
  const cx = 256;
  const cy = 256;
  return Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" fill="#0E1F17"/>
  <g transform="translate(${cx} ${cy}) scale(${scale}) translate(${-cx} ${-cy})"
     stroke="#F4A7B9" stroke-width="30" stroke-linecap="round" fill="none">
    <line x1="152" y1="146" x2="146" y2="368"/>
    <line x1="224" y1="140" x2="228" y2="374"/>
    <line x1="294" y1="148" x2="290" y2="366"/>
    <line x1="364" y1="142" x2="368" y2="372"/>
    <line x1="112" y1="350" x2="402" y2="162"/>
  </g>
</svg>`);
};

const jobs = [
  ["public/icons/icon-192.png", svg(1), 192],
  ["public/icons/icon-512.png", svg(1), 512],
  ["public/icons/maskable-512.png", svg(0.72), 512],
  ["public/icons/apple-touch-icon.png", svg(1), 180],
];

for (const [file, buf, size] of jobs) {
  await sharp(buf).resize(size, size).png().toFile(file);
  console.log(`${file} (${size}x${size})`);
}
