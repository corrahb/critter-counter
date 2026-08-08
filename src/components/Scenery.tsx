/* ── the seasonal forest — layered treelines + drifting particles ──
   Lives inside the header, behind the text. Pure CSS animation, a
   handful of nodes, deterministic jitter (same trick as the tallies) so
   nothing twitches on re-render. prefers-reduced-motion stills it. */
import type { Season } from "../lib/season";

const jitter = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

interface SceneColors {
  /** Header gradient's top color — the sky at dusk. */
  sky: string;
  back: string;
  front: string;
  particle: string;
  glow: boolean;
  kind: "petal" | "firefly" | "leaf" | "snow";
  count: number;
}

export const SCENES: Record<Season, SceneColors> = {
  spring: {
    sky: "#244831",
    back: "#16341F",
    front: "#0F2917",
    particle: "#F4A7B9",
    glow: false,
    kind: "petal",
    count: 7,
  },
  summer: {
    sky: "#1E4232",
    back: "#132C1F",
    front: "#0D2115",
    particle: "#E4E98A",
    glow: true,
    kind: "firefly",
    count: 6,
  },
  autumn: {
    sky: "#453522",
    back: "#2E2414",
    front: "#20190D",
    particle: "#D08A4E",
    glow: false,
    kind: "leaf",
    count: 7,
  },
  winter: {
    sky: "#293A44",
    back: "#1B2A31",
    front: "#122028",
    particle: "#F0EBDA",
    glow: false,
    kind: "snow",
    count: 9,
  },
};

/* two hand-drawn treelines: conifer spikes with a few deciduous domes */
const BACK_TREES =
  "M0,60 L0,38 L10,22 L20,38 L24,30 Q30,18 36,30 L40,38 L52,14 L64,38 L70,32 Q78,20 86,32 L92,38 L104,20 L116,38 L122,34 Q130,24 138,34 L146,38 L158,12 L170,38 L178,32 Q186,22 194,32 L200,38 L212,18 L224,38 L230,34 Q240,26 250,34 L256,38 L268,16 L280,38 L288,30 Q296,20 304,30 L312,38 L324,22 L336,38 L344,34 Q352,28 360,34 L360,60 Z";
const FRONT_TREES =
  "M0,60 L0,46 L14,28 L28,46 L36,40 Q44,30 52,40 L58,46 L74,24 L90,46 L100,42 Q110,32 120,42 L128,46 L144,26 L160,46 L168,40 Q178,32 188,40 L196,46 L214,28 L232,46 L242,42 Q252,34 262,42 L270,46 L288,26 L306,46 L316,40 Q326,34 336,40 L344,46 L352,44 L360,46 L360,60 Z";

export function Scenery({ season }: { season: Season }) {
  const s = SCENES[season];
  return (
    <div
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
    >
      <style>{`
        @keyframes ccFall {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 0; }
          12% { opacity: .75; }
          88% { opacity: .6; }
          100% { transform: translateY(120px) rotate(200deg); opacity: 0; }
        }
        @keyframes ccDrift {
          0% { transform: translate(0, 0); opacity: .15; }
          25% { opacity: .9; }
          50% { transform: translate(14px, -10px); opacity: .25; }
          75% { opacity: .85; }
          100% { transform: translate(-6px, 6px); opacity: .15; }
        }
        @media (prefers-reduced-motion: reduce) {
          .cc-part { animation: none !important; opacity: .35 !important; }
        }
      `}</style>

      {/* particles drift between the two treelines */}
      {Array.from({ length: s.count }).map((_, i) => {
        const left = 4 + jitter(i * 13 + 1) * 92;
        const delay = jitter(i * 7 + 3) * 9;
        const dur = 7 + jitter(i * 5 + 2) * 8;
        const size = s.kind === "firefly" ? 3 : s.kind === "snow" ? 4 : 7;
        // fireflies hover among the trees (a px band above the bottom),
        // never in the text rows — their glow parked behind an 11px label
        // was ruining its contrast; falling particles pass text only
        // transiently
        const anchor =
          s.kind === "firefly"
            ? { bottom: 10 + jitter(i * 3) * 20 }
            : { top: -6 };
        return (
          <span
            key={i}
            className="cc-part"
            style={{
              position: "absolute",
              left: `${left}%`,
              ...anchor,
              width: size,
              height: size,
              background: s.particle,
              borderRadius:
                s.kind === "petal"
                  ? "70% 30% 60% 40%"
                  : s.kind === "leaf"
                    ? "0 70% 0 70%"
                    : "50%",
              boxShadow: s.glow ? `0 0 6px 1px ${s.particle}` : "none",
              opacity: 0,
              animation: `${s.kind === "firefly" ? "ccDrift" : "ccFall"} ${dur}s linear ${delay}s infinite`,
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
