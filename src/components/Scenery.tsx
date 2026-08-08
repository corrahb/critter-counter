/* ── the living forest — season × time-of-day × tonight's weather ──
   Lives inside the header, behind the text. The sky slides from day
   through dusk into night against the real (or season-approximate)
   sunset; the draft's weather chip restyles it: rain streaks, snow,
   cloud dulling, wind speed. Pure CSS animation, deterministic jitter,
   prefers-reduced-motion stills everything. */
import type { Season } from "../lib/season";
import type { WeatherId } from "../types";
import { mix3, mixHex, phaseOf } from "../lib/sky";

const jitter = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return x - Math.floor(x);
};

type ParticleKind = "petal" | "firefly" | "leaf" | "snow" | "rain";

interface SeasonSpec {
  /** Sky at full day / dusk / full night. The day stops AND every
      weather mix of them are verified ≥4.77:1 against the header's
      #A9C5B4 eyebrows (run: node tools/contrast-check.mjs) — change
      these or the weather targets only together with that check. */
  skyDay: string;
  skyDusk: string;
  skyNight: string;
  back: string;
  front: string;
  particle: string;
  glow: boolean;
  kind: ParticleKind;
  count: number;
}

const SEASON_SPECS: Record<Season, SeasonSpec> = {
  spring: {
    skyDay: "#27503A",
    skyDusk: "#244831",
    skyNight: "#0D1B13",
    back: "#16341F",
    front: "#0F2917",
    particle: "#F4A7B9",
    glow: false,
    kind: "petal",
    count: 7,
  },
  summer: {
    skyDay: "#264A37",
    skyDusk: "#1E4232",
    skyNight: "#0A1710",
    back: "#132C1F",
    front: "#0D2115",
    particle: "#E4E98A",
    glow: true,
    kind: "firefly",
    count: 6,
  },
  autumn: {
    skyDay: "#4A3D2A",
    skyDusk: "#453522",
    skyNight: "#150F08",
    back: "#2E2414",
    front: "#20190D",
    particle: "#D08A4E",
    glow: false,
    kind: "leaf",
    count: 7,
  },
  winter: {
    skyDay: "#2E4753",
    skyDusk: "#293A44",
    skyNight: "#0C1319",
    back: "#1B2A31",
    front: "#122028",
    particle: "#F0EBDA",
    glow: false,
    kind: "snow",
    count: 9,
  },
};

export interface Scene {
  sky: string;
  back: string;
  front: string;
  particle: string;
  glow: boolean;
  kind: ParticleKind;
  count: number;
  windy: boolean;
  stars: boolean;
}

/**
 * The one place season, time blend (0 day → 1 sunset → 2 night), and
 * tonight's weather become a paintable scene. App uses .sky for the
 * header gradient; Scenery renders the rest.
 */
export function sceneFor(season: Season, blend: number, weather: WeatherId | null): Scene {
  const s = SEASON_SPECS[season];
  let sky = mix3(s.skyDay, s.skyDusk, s.skyNight, blend);
  // treelines follow the light with one rule instead of 12 hand tunings
  const dayT = Math.max(0, 1 - blend);
  const nightT = Math.max(0, blend - 1);
  let back = mixHex(mixHex(s.back, "#5F8A6F", dayT * 0.22), "#000000", nightT * 0.4);
  let front = mixHex(mixHex(s.front, "#5F8A6F", dayT * 0.16), "#000000", nightT * 0.4);

  let kind = s.kind;
  let particle = s.particle;
  let glow = s.glow;
  let count = s.count;
  let windy = false;

  // weather targets are DARK greys — overcast dulls a sky, it doesn't
  // backlight it, and this is what keeps the contrast guarantee intact
  if (weather === "cloudy") {
    sky = mixHex(sky, "#454E4A", 0.35);
    back = mixHex(back, "#3A423E", 0.2);
    front = mixHex(front, "#3A423E", 0.15);
    count = Math.ceil(count / 2);
  } else if (weather === "rain") {
    sky = mixHex(sky, "#333F46", 0.35);
    back = mixHex(back, "#2C363C", 0.25);
    front = mixHex(front, "#2C363C", 0.18);
    kind = "rain";
    particle = "#9FB8C4";
    glow = false;
    count = 11;
  } else if (weather === "snow") {
    sky = mixHex(sky, "#46525A", 0.25);
    kind = "snow";
    particle = "#F0EBDA";
    glow = false;
    count = 10;
  } else if (weather === "windy") {
    windy = true;
  }

  // fireflies only come out around dusk, and stars only on clear nights
  if (kind === "firefly" && blend < 0.85) count = 0;
  const stars =
    phaseOf(blend) === "night" && (weather == null || weather === "clear" || weather === "windy");

  return { sky, back, front, particle, glow, kind, count, windy, stars };
}

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
      style={{
        position: "absolute",
        inset: 0,
        overflow: "hidden",
        pointerEvents: "none",
      }}
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
             strip on the top edge, so hide them; fireflies and stars are
             position-anchored and stay as the still scene */
          .cc-fall { opacity: 0 !important; }
        }
      `}</style>

      {/* stars — clear nights only, in the strip above all text */}
      {s.stars &&
        Array.from({ length: 8 }).map((_, i) => (
          <span
            key={`star-${i}`}
            className="cc-star"
            style={{
              position: "absolute",
              left: `${5 + jitter(i * 17 + 5) * 90}%`,
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
        // the bottom) — below every text row on both header heights,
        // including the count digits and the short header's title line
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
