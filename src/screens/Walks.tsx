/* ── WALKS — reverse-chronological log, ported exactly ──────── */
import type { WalkLog } from "../hooks/useWalkLog";
import { C, card, chip } from "../theme";
import { Tally } from "../components/Tally";
import { WEATHER } from "../data/constants";
import { addMins, fmtMins, fmtTime, prettyDate } from "../lib/time";
import { moonOf } from "../lib/moon";
import { sum } from "../lib/stats";

export function Walks({ log }: { log: WalkLog }) {
  const { walks, species } = log;

  return (
    <main style={{ padding: "18px 20px 0", display: "grid", gap: 12 }} className="fade">
      {walks.length === 0 && (
        <div style={{ ...card, padding: 26, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>🌒</div>
          <div style={{ marginTop: 10, font: "600 17px 'Fraunces', Georgia, serif" }}>
            No walks logged yet
          </div>
          <div style={{ color: C.sage, fontSize: 14, marginTop: 6 }}>
            Start tallying on the Tonight tab and your first walk will land here.
          </div>
        </div>
      )}
      {walks.map((w) => {
        const t = sum(w.counts);
        const r = w.road;
        return (
          <div key={w.id} style={card}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: 10,
              }}
            >
              <div
                style={{
                  font: "600 16px 'Fraunces', Georgia, serif",
                  fontVariationSettings: '"SOFT" 30, "WONK" 1',
                }}
              >
                {prettyDate(w.date)}
              </div>
              <div style={{ font: "700 18px 'Azeret Mono', monospace" }}>
                {t}
                <span style={{ color: C.sage, fontSize: 12, fontWeight: 400 }}> seen</span>
              </div>
            </div>

            <div style={{ marginTop: 9 }}>
              <Tally n={t} color={C.mint} h={18} max={16} />
            </div>

            <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}>
              {species
                .filter((s) => w.counts?.[s.id])
                .map((s) => (
                  <span key={s.id} style={chip}>
                    {s.icon} {w.counts[s.id]}
                  </span>
                ))}
              {w.time && (
                <span style={{ ...chip, color: C.cream }}>
                  {fmtTime(w.time)}
                  {w.endTime
                    ? ` → ${fmtTime(w.endTime)}`
                    : w.duration
                      ? ` → ${fmtTime(addMins(w.time, w.duration))}`
                      : ""}
                </span>
              )}
              {w.duration != null && w.duration > 0 && (
                <span style={{ ...chip, color: C.mint, borderColor: "rgba(147,216,176,.35)" }}>
                  ⏱ {fmtMins(w.duration)}
                </span>
              )}
              {w.weather && (
                <span style={{ ...chip, color: C.sage }}>
                  {WEATHER.find((x) => x.id === w.weather)?.icon}{" "}
                  {WEATHER.find((x) => x.id === w.weather)?.label}
                </span>
              )}
              <span
                style={{ ...chip, color: C.sage, borderColor: "transparent", padding: "6px 4px" }}
                title={moonOf(w.date).name}
              >
                {moonOf(w.date).icon}
              </span>
              {r > 0 && (
                <span style={{ ...chip, color: C.blossom, borderColor: "rgba(244,167,185,.4)" }}>
                  🚏 {r} on Bunny Road
                </span>
              )}
            </div>

            {w.note && (
              <div
                style={{
                  marginTop: 12,
                  fontSize: 14,
                  color: C.cream,
                  opacity: 0.75,
                  fontStyle: "italic",
                }}
              >
                {w.note}
              </div>
            )}

            <button
              onClick={() => log.deleteWalk(w.id)}
              style={{
                marginTop: 12,
                background: "none",
                border: "none",
                color: C.sage,
                font: "500 12px 'Azeret Mono', monospace",
                letterSpacing: ".08em",
                cursor: "pointer",
                padding: "4px 0",
                textTransform: "uppercase",
              }}
            >
              Delete walk
            </button>
          </div>
        );
      })}
    </main>
  );
}
