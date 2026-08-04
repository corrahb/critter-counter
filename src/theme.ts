/* ── palette: mossy evening, blossom, mint — ported exactly ─── */
import type { CSSProperties } from "react";

export const C = {
  moss: "#0E1F17",
  fern: "#173328",
  sprig: "#234836",
  cream: "#F0EBDA",
  blossom: "#F4A7B9",
  mint: "#93D8B0",
  sage: "#7FA08D",
};

export const card: CSSProperties = {
  background: C.fern,
  borderRadius: 16,
  border: `1px solid ${C.sprig}`,
  padding: 16,
  maxWidth: "100%",
  minWidth: 0,
};

export const primaryBtn: CSSProperties = {
  padding: "15px",
  borderRadius: 13,
  border: "none",
  background: C.blossom,
  color: C.moss,
  font: "700 16px 'Karla', sans-serif",
  cursor: "pointer",
};

export const ghostBtn: CSSProperties = {
  padding: "15px 20px",
  borderRadius: 13,
  border: `1px solid ${C.sprig}`,
  background: "transparent",
  color: C.sage,
  font: "500 15px 'Karla', sans-serif",
  cursor: "pointer",
};

export const chip: CSSProperties = {
  padding: "6px 11px",
  borderRadius: 999,
  border: `1px solid ${C.sprig}`,
  font: "500 13px 'Azeret Mono', monospace",
  color: C.cream,
};

export const shell: CSSProperties = {
  minHeight: "100vh",
  background: C.moss,
  color: C.cream,
  fontFamily: "'Karla', system-ui, sans-serif",
  overflowX: "hidden",
  maxWidth: "100%",
  paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
};

/* Global styles. Fonts are SELF-HOSTED (public/fonts) so the whole
   visual identity works offline — no CDN. Fraunces is the variable
   build with the SOFT and WONK axes the design depends on. */
const B = import.meta.env.BASE_URL;

export const css = `
  @font-face {
    font-family: 'Fraunces';
    src: url('${B}fonts/fraunces.woff2') format('woff2');
    font-weight: 400 700;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Karla';
    src: url('${B}fonts/karla.woff2') format('woff2');
    font-weight: 400 700;
    font-style: normal;
    font-display: swap;
  }
  @font-face {
    font-family: 'Azeret Mono';
    src: url('${B}fonts/azeret.woff2') format('woff2');
    font-weight: 400 700;
    font-style: normal;
    font-display: swap;
  }
  * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
  .tk { animation: draw .34s ease-out backwards; }
  @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
  .tk { stroke-dasharray: 1; }
  .tap:active { transform: scale(.93); }
  .tap { transition: transform .09s ease, background .15s ease, border-color .15s ease; }
  .rowtap { transition: transform .1s ease, border-color .25s ease, box-shadow .12s ease; }
  .rowtap:active { transform: scale(.985); box-shadow: inset 0 0 0 999px rgba(244,167,185,.08); }
  .row { transition: background .25s ease, border-color .25s ease; }
  button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
    outline: 2px solid ${C.mint}; outline-offset: 3px;
  }
  input { font-family: 'Azeret Mono', monospace; }
  input[type=date], input[type=time] { color-scheme: dark; }
  input::placeholder { color: ${C.sage}; }
  .fade { animation: fade .3s ease-out; }
  @keyframes fade { from { opacity: 0; transform: translateY(6px);} to {opacity:1; transform:none;} }
  @media (prefers-reduced-motion: reduce) {
    .tk, .fade { animation: none; }
    .tap:active { transform: none; }
    .rowtap:active { transform: none; }
  }
`;
