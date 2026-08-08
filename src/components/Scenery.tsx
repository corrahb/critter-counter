/* ── the living forest, rendering only — all scene DECISIONS live in
   src/lib/sky.ts (sceneFor), where they're testable and the palette is
   contrast-swept. Deterministic jitter keeps re-renders still;
   prefers-reduced-motion stills or hides what animation places. */
import type { Scene } from "../lib/sky";
import { moonOf } from "../lib/moon";
import { today } from "../lib/time";

const jitter = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

/* two hand-drawn treelines: conifer spikes with a few deciduous domes */
const BACK_TREES =
  "M0,60 L0,38 L10,22 L20,38 L24,30 Q30,18 36,30 L40,38 L52,14 L64,38 L70,32 Q78,20 86,32 L92,38 L104,20 L116,38 L122,34 Q130,24 138,34 L146,38 L158,12 L170,38 L178,32 Q186,22 194,32 L200,38 L212,18 L224,38 L230,34 Q240,26 250,34 L256,38 L268,16 L280,38 L288,30 Q296,20 304,30 L312,38 L324,22 L336,38 L344,34 Q352,28 360,34 L360,60 Z";
const FRONT_TREES =
  "M0,60 L0,46 L14,28 L28,46 L36,40 Q44,30 52,40 L58,46 L74,24 L90,46 L100,42 Q110,32 120,42 L128,46 L144,26 L160,46 L168,40 Q178,32 188,40 L196,46 L214,28 L232,46 L242,42 Q252,34 262,42 L270,46 L288,26 L306,46 L316,40 Q326,34 336,40 L344,46 L352,44 L360,46 L360,60 Z";

export function Scenery({ scene }: { scene: Scene }) {
  const s = scene;
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", inset: 0, overflow: "hidden", pointerEvents: "none" }}
    >
      <style>{`
        @keyframes ccFall {
          0% { transform: translate(0, -12px) rotate(0deg); opacity: 0; }
          12% { opacity: .75; }
          88% { opacity: .6; }
          100% { transform: translate(0, 120px) rotate(200deg); opacity: 0; }
        }
        @keyframes ccFallWind {
          0% { transform: translate(0, -12px) rotate(0deg); opacity: 0; }
          12% { opacity: .8; }
          88% { opacity: .6; }
          100% { transform: translate(48px, 120px) rotate(320deg); opacity: 0; }
        }
        @keyframes ccRain {
          0% { transform: translate(0, -14px); opacity: 0; }
          15% { opacity: .55; }
          85% { opacity: .45; }
          100% { transform: translate(-8px, 130px); opacity: 0; }
        }
        @keyframes ccDrift {
          0% { transform: translate(0, 0); opacity: .15; }
          25% { opacity: .9; }
          50% { transform: translate(14px, -10px); opacity: .25; }
          75% { opacity: .85; }
          100% { transform: translate(-6px, 6px); opacity: .15; }
        }
        @keyframes ccTwinkle {
          0%, 100% { opacity: .15; }
          50% { opacity: .55; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-part, .cc-star { animation: none !important; opacity: .35 !important; }
          /* fall-type particles are placed by their animation (they start
             above the header) — stilled, they'd be a clipped artifact
             strip on the top edge, so hide them; fireflies, stars, sun
             and moon are position-anchored and stay as the still scene */
          .cc-fall { opacity: 0 !important; }
        }
      `}</style>

      {/* the sun — a soft warm disc, high right, daylight + clear only */}
      {s.sun && (
        <span
          style={{
            position: "absolute",
            right: 26,
            top: 12,
            width: 34,
            height: 34,
            borderRadius: "50%",
            background: "#F7F0C4",
            boxShadow: "0 0 22px 10px rgba(247, 240, 196, .55)",
            opacity: 0.9,
          }}
        />
      )}

      {/* the moon — tonight's actual phase, clear nights; sits fully
          above the eyebrow text row on both header heights */}
      {s.moon && (
        <span style={{ position: "absolute", right: 30, top: 6, fontSize: 15, opacity: 0.9 }}>
          {moonOf(today()).icon}
        </span>
      )}

      {/* stars — clear nights only, in the strip above all text */}
      {s.stars &&
        Array.from({ length: 8 }).map((_, i) => (
          <span
            key={`star-${i}`}
            className="cc-star"
            style={{
              position: "absolute",
              left: `${5 + jitter(i * 17 + 5) * 85}%`,
              top: 4 + jitter(i * 11 + 2) * 12,
              width: i % 3 === 0 ? 2 : 1.5,
              height: i % 3 === 0 ? 2 : 1.5,
              borderRadius: "50%",
              background: "#F0EBDA",
              opacity: 0.15,
              animation: `ccTwinkle ${3 + jitter(i * 7) * 4}s ease-in-out ${jitter(i * 5) * 3}s infinite`,
            }}
          />
        ))}

      {/* particles */}
      {Array.from({ length: s.count }).map((_, i) => {
        const left = 4 + jitter(i * 13 + 1) * 92;
        const delay = jitter(i * 7 + 3) * (s.kind === "rain" ? 3 : 9);
        const baseDur = s.kind === "rain" ? 2.4 + jitter(i * 5 + 2) * 1.6 : 7 + jitter(i * 5 + 2) * 8;
        const dur = s.windy ? baseDur * 0.55 : baseDur;
        const isRain = s.kind === "rain";
        const size = s.kind === "firefly" ? 3 : s.kind === "snow" ? 4 : 7;
        // fireflies hover INSIDE the front treeline strip (6-16px from
        // the bottom) — below every text row on both header heights
        const anchor = s.kind === "firefly" ? { bottom: 6 + jitter(i * 3) * 10 } : { top: -6 };
        const anim =
          s.kind === "firefly" ? "ccDrift" : isRain ? "ccRain" : s.windy ? "ccFallWind" : "ccFall";
        return (
          <span
            key={i}
            className={s.kind === "firefly" ? "cc-part" : "cc-part cc-fall"}
            style={{
              position: "absolute",
              left: `${left}%`,
              ...anchor,
              width: isRain ? 1.5 : size,
              height: isRain ? 10 : size,
              background: s.particle,
              borderRadius: isRain
                ? 1
                : s.kind === "petal"
                  ? "70% 30% 60% 40%"
                  : s.kind === "leaf"
                    ? "0 70% 0 70%"
                    : "50%",
              boxShadow: s.glow ? `0 0 6px 1px ${s.particle}` : "none",
              opacity: 0,
              animation: `${anim} ${dur}s linear ${delay}s infinite`,
            }}
          />
        );
      })}

      {/* treelines hug the bottom of the header */}
      <svg
        viewBox="0 0 360 60"
        preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, right: 0, bottom: 0, width: "100%", height: 46, display: "block" }}
      >
        <path d={BACK_TREES} fill={s.back} opacity={0.85} />
      </svg>
      <svg
        viewBox="0 0 360 60"
        preserveAspectRatio="none"
        style={{ position: "absolute", left: 0, right: 0, bottom: -2, width: "100%", height: 34, display: "block" }}
      >
        <path d={FRONT_TREES} fill={s.front} />
      </svg>
    </div>
  );
}
