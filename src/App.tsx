import { useState } from "react";
import { useWalkLog } from "./hooks/useWalkLog";
import { C, css, shell } from "./theme";
import { Eyebrow } from "./components/bits";
import { Tally } from "./components/Tally";
import { Tonight } from "./screens/Tonight";
import { Walks } from "./screens/Walks";
import { Patterns } from "./screens/Patterns";
import { prettyDate } from "./lib/time";
import { sum } from "./lib/stats";

type View = "tonight" | "walks" | "patterns";

export default function App() {
  const log = useWalkLog();
  const [view, setView] = useState<View>("tonight");

  const draftTotal = sum(log.draft.counts);
  const onRoad = (log.draft.road || 0) > 0;

  return (
    <div style={shell}>
      <style>{css}</style>

      {/* header */}
      <header
        style={{
          padding: "26px 20px 20px",
          background: onRoad
            ? `linear-gradient(170deg, #33222B 0%, ${C.moss} 78%)`
            : `linear-gradient(170deg, #1E4232 0%, ${C.moss} 78%)`,
          transition: "background .5s ease",
          borderBottom: `1px solid ${C.sprig}`,
        }}
      >
        <div
          style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}
        >
          <div
            style={{
              font: "700 23px 'Fraunces', Georgia, serif",
              fontVariationSettings: '"SOFT" 30, "WONK" 1',
              letterSpacing: "-.01em",
              flexShrink: 0,
            }}
          >
            Critter Counter
          </div>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <Eyebrow color={onRoad ? C.blossom : C.sage}>
              {view === "tonight" ? prettyDate(log.draft.date) : `${log.walks.length} walks`}
            </Eyebrow>
          </div>
        </div>

        {view === "tonight" && (
          <div style={{ marginTop: 18 }}>
            <Eyebrow>Seen tonight</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8, minHeight: 34 }}>
              <div
                style={{
                  font: "700 40px 'Azeret Mono', monospace",
                  lineHeight: 0.9,
                  color: onRoad ? C.blossom : C.cream,
                  transition: "color .4s ease",
                }}
              >
                {draftTotal}
              </div>
              <div style={{ paddingBottom: 2, flex: 1, minWidth: 0 }}>
                <Tally n={draftTotal} color={onRoad ? C.blossom : C.cream} h={20} max={18} />
              </div>
            </div>
          </div>
        )}
      </header>

      {log.err && (
        <div
          style={{
            margin: "14px 20px 0",
            padding: "10px 14px",
            borderRadius: 12,
            background: "#3A2029",
            border: "1px solid #7A4553",
            fontSize: 13,
          }}
        >
          {log.err}
        </div>
      )}

      {log.futureSchema != null && (
        <div
          style={{
            margin: "14px 20px 0",
            padding: "10px 14px",
            borderRadius: 12,
            background: "#3A3220",
            border: "1px solid #7A6B45",
            fontSize: 13,
            lineHeight: 1.5,
          }}
        >
          Your log was written by a newer version of this app. Everything is shown, and the newer
          copy is kept safe — but saving from this version may drop its newer details. Best to
          update the app.
        </div>
      )}

      {view === "tonight" && (
        <Tonight log={log} onSaved={(beat) => setView(beat ? "patterns" : "walks")} />
      )}
      {view === "walks" && <Walks log={log} />}
      {view === "patterns" && <Patterns log={log} />}

      {/* toast */}
      {log.toast && (
        <div
          className="fade"
          style={{
            position: "fixed",
            left: 20,
            right: 20,
            bottom: "calc(96px + env(safe-area-inset-bottom))",
            background: C.sprig,
            border: `1px solid ${C.sage}`,
            borderRadius: 12,
            padding: "13px 16px",
            fontSize: 14,
            textAlign: "center",
            zIndex: 20,
          }}
        >
          {log.toast}
        </div>
      )}

      {/* nav */}
      <nav
        style={{
          position: "fixed",
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: 30,
          background: "rgba(14,31,23,.94)",
          backdropFilter: "blur(12px)",
          borderTop: `1px solid ${C.sprig}`,
          padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
          display: "grid",
          gridTemplateColumns: "1fr 1fr 1fr",
          gap: 6,
        }}
      >
        {(
          [
            ["tonight", "Tonight", "🌙"],
            ["walks", "Walks", "📓"],
            ["patterns", "Patterns", "📈"],
          ] as const
        ).map(([id, label, icon]) => (
          <button
            key={id}
            onClick={() => setView(id)}
            className="tap"
            style={{
              padding: "9px 4px",
              borderRadius: 12,
              border: "none",
              cursor: "pointer",
              background: view === id ? C.fern : "transparent",
              color: view === id ? C.cream : C.sage,
              display: "grid",
              gap: 3,
              justifyItems: "center",
            }}
          >
            <span style={{ fontSize: 17, filter: view === id ? "none" : "grayscale(1) opacity(.6)" }}>
              {icon}
            </span>
            <span
              style={{
                font: "500 11px 'Azeret Mono', monospace",
                letterSpacing: ".08em",
                textTransform: "uppercase",
              }}
            >
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
