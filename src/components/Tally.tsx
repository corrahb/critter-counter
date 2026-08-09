/* ── signature element: five-bar gate tally marks ─────────────
   Hand-drawn SVG tallies with deterministic jitter (seeded by index so
   strokes don't twitch on re-render) and a draw-in animation for
   genuinely new strokes. This is the whole visual identity — ported
   exactly from the prototype. */
import { C } from "../theme";

const jitter = (seed: number): number => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 1.6;
};

export interface TallyProps {
  n: number;
  color?: string;
  h?: number;
  gap?: number;
  max?: number;
}

export function Tally({ n, color = C.cream, h = 22, gap = 7, max = 24 }: TallyProps) {
  const total = Math.max(0, Math.round(n));
  const shown = Math.min(total, max * 5);
  const groups: number[] = [];
  const full = Math.floor(shown / 5);
  for (let i = 0; i < full; i++) groups.push(5);
  if (shown % 5) groups.push(shown % 5);

  // zero renders NOTHING — the placeholder dash read as clutter
  if (total === 0) return null;

  return (
    <span
      style={{
        display: "inline-flex",
        flexWrap: "wrap",
        gap: `${gap * 0.6}px ${gap}px`,
        alignItems: "center",
      }}
    >
      {groups.map((count, gi) => (
        <svg
          key={gi}
          width={h * 1.12}
          height={h}
          viewBox="0 0 25 22"
          style={{ overflow: "visible", flexShrink: 0 }}
        >
          {Array.from({ length: Math.min(count, 4) }).map((_, si) => {
            const x = 3.5 + si * 5.2 + jitter(gi * 9 + si);
            return (
              <line
                key={si}
                className="tk"
                x1={x}
                y1={2 + jitter(gi + si * 3)}
                x2={x + jitter(si * 7 + gi)}
                y2={20 + jitter(gi * 2 + si)}
                stroke={color}
                strokeWidth="2.1"
                strokeLinecap="round"
                pathLength="1"
              />
            );
          })}
          {count === 5 && (
            <line
              className="tk"
              x1="0.5"
              y1="19.5"
              x2="22"
              y2="2.5"
              stroke={color}
              strokeWidth="2.1"
              strokeLinecap="round"
              pathLength="1"
            />
          )}
        </svg>
      ))}
      {total > shown && (
        <span style={{ font: "600 13px 'Azeret Mono', monospace", color }}>+{total - shown}</span>
      )}
    </span>
  );
}
