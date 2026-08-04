/* ── TONIGHT — the counting screen, ported exactly ──────────── */
import type { Dispatch, SetStateAction } from "react";
import type { WalkLog } from "../hooks/useWalkLog";
import type { TonightForm } from "./forms";
import { C, card, ghostBtn, primaryBtn } from "../theme";
import { Eyebrow, StepButton } from "../components/bits";
import { Tally } from "../components/Tally";
import { ICONS, WEATHER } from "../data/constants";
import { fmtMins, fmtTime, minsBetween, today } from "../lib/time";
import { moonOf } from "../lib/moon";

export function Tonight({
  log,
  form,
  setForm,
  onSaved,
}: {
  log: WalkLog;
  form: TonightForm;
  setForm: Dispatch<SetStateAction<TonightForm>>;
  onSaved: (beat: boolean) => void;
}) {
  const { draft, species, bump, bumpRoad, setRoad, setDraftField } = log;
  const { adding, newName, newIcon } = form;
  const setAdding = (adding: boolean) => setForm((f) => ({ ...f, adding }));
  const setNewName = (newName: string) => setForm((f) => ({ ...f, newName }));
  const setNewIcon = (newIcon: string) => setForm((f) => ({ ...f, newIcon }));

  const draftRoad = draft.road || 0;
  const onRoad = draftRoad > 0;

  return (
    <main style={{ padding: "18px 20px 0", display: "grid", gap: 14 }} className="fade">
      {/* species counters — the whole row adds one, so nothing sits off-screen */}
      <div style={{ display: "grid", gap: 9 }}>
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "0 2px",
          }}
        >
          <Eyebrow>Tap a row to add one</Eyebrow>
          <span style={{ fontSize: 12, color: C.sage }}>− undoes</span>
        </div>

        {species.map((s) => {
          const n = draft.counts[s.id] || 0;
          return (
            <div
              key={s.id}
              role="button"
              tabIndex={0}
              aria-label={`Add one ${s.name}, currently ${n}`}
              onClick={() => bump(s.id, 1)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  bump(s.id, 1);
                }
              }}
              className="rowtap"
              style={{
                ...card,
                padding: "11px 12px",
                cursor: "pointer",
                userSelect: "none",
                WebkitUserSelect: "none",
                borderColor: n ? "rgba(147,216,176,.35)" : C.sprig,
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                <span style={{ fontSize: 21, flexShrink: 0 }}>{s.icon}</span>

                <span
                  style={{
                    flex: 1,
                    minWidth: 0,
                    font: "600 16px 'Fraunces', Georgia, serif",
                    fontVariationSettings: '"SOFT" 30, "WONK" 1',
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {s.name}
                </span>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    bump(s.id, -1);
                  }}
                  aria-label={`One fewer ${s.name}`}
                  className="tap"
                  style={{
                    width: 34,
                    height: 34,
                    flexShrink: 0,
                    borderRadius: 10,
                    cursor: "pointer",
                    border: `1px solid ${C.sprig}`,
                    background: "transparent",
                    color: C.sage,
                    font: "500 18px 'Karla', sans-serif",
                    display: "grid",
                    placeItems: "center",
                  }}
                >
                  −
                </button>

                <span
                  style={{
                    font: "700 24px 'Azeret Mono', monospace",
                    color: n ? C.cream : C.sage,
                    minWidth: 28,
                    textAlign: "right",
                    flexShrink: 0,
                  }}
                >
                  {n}
                </span>

                <span
                  aria-hidden="true"
                  style={{
                    width: 44,
                    height: 44,
                    flexShrink: 0,
                    borderRadius: 999,
                    pointerEvents: "none",
                    background: C.blossom,
                    color: C.moss,
                    font: "500 26px 'Karla', sans-serif",
                    display: "grid",
                    placeItems: "center",
                    lineHeight: 1,
                  }}
                >
                  +
                </span>
              </div>

              {n > 0 && (
                <div style={{ marginTop: 8, paddingLeft: 30 }}>
                  <Tally n={n} color={C.mint} h={16} gap={5} max={12} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* add a critter */}
      {!adding ? (
        <button
          onClick={() => setAdding(true)}
          className="tap"
          style={{
            padding: "13px",
            borderRadius: 14,
            border: `1px dashed ${C.sprig}`,
            background: "transparent",
            color: C.sage,
            font: "500 14px 'Karla', sans-serif",
            cursor: "pointer",
          }}
        >
          + Add another critter
        </button>
      ) : (
        <div style={card}>
          <Eyebrow>New critter</Eyebrow>
          <input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Skunk, deer, fox…"
            autoFocus
            style={{
              width: "100%",
              marginTop: 10,
              padding: "12px 14px",
              borderRadius: 11,
              border: `1px solid ${C.sprig}`,
              background: C.moss,
              color: C.cream,
              fontSize: 16,
            }}
          />
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
            {ICONS.map((ic) => (
              <button
                key={ic}
                onClick={() => setNewIcon(ic)}
                className="tap"
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  fontSize: 19,
                  cursor: "pointer",
                  background: newIcon === ic ? "rgba(244,167,185,.15)" : "transparent",
                  border: `1.5px solid ${newIcon === ic ? C.blossom : C.sprig}`,
                }}
              >
                {ic}
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
            <button
              onClick={() => {
                // only close on a real add — a blank name (or a storage
                // failure) keeps the form and its icon selection open
                if (log.addSpecies(newName, newIcon)) {
                  setNewName("");
                  setAdding(false);
                }
              }}
              className="tap"
              style={{ ...primaryBtn, flex: 1 }}
            >
              Add critter
            </button>
            <button
              onClick={() => {
                setAdding(false);
                setNewName("");
              }}
              className="tap"
              style={ghostBtn}
            >
              Cancel
            </button>
          </div>
          {species.some((s) => s.custom) && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.sprig}` }}>
              <Eyebrow>Your critters</Eyebrow>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
                {species
                  .filter((s) => s.custom)
                  .map((s) => (
                    <button
                      key={s.id}
                      onClick={() => log.removeSpecies(s.id)}
                      className="tap"
                      style={{
                        padding: "7px 12px",
                        borderRadius: 999,
                        border: `1px solid ${C.sprig}`,
                        background: "transparent",
                        color: C.sage,
                        fontSize: 13,
                        cursor: "pointer",
                      }}
                    >
                      {s.icon} {s.name} ×
                    </button>
                  ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bunny Road — kept as its own number */}
      <div
        style={{
          ...card,
          background: onRoad ? "rgba(244,167,185,.10)" : C.fern,
          borderColor: onRoad ? "rgba(244,167,185,.5)" : C.sprig,
          transition: "background .35s ease, border-color .35s ease",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 19, filter: onRoad ? "none" : "grayscale(1) opacity(.6)" }}>
            🚏
          </span>
          <Eyebrow color={onRoad ? C.blossom : C.sage}>Bunny Road</Eyebrow>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
          <StepButton onClick={() => bumpRoad(-1)} label="One fewer bunny on Bunny Road">
            −
          </StepButton>
          <input
            value={draftRoad}
            inputMode="numeric"
            onChange={(e) => setRoad(e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label="Bunnies on Bunny Road"
            style={{
              flex: 1,
              minWidth: 0,
              textAlign: "center",
              padding: "12px 4px",
              borderRadius: 12,
              border: `1px solid ${onRoad ? "rgba(244,167,185,.4)" : C.sprig}`,
              background: C.moss,
              color: onRoad ? C.blossom : C.sage,
              font: "700 30px 'Azeret Mono', monospace",
            }}
          />
          <StepButton onClick={() => bumpRoad(1)} tone="go" label="One more bunny on Bunny Road">
            +
          </StepButton>
        </div>

        <div style={{ marginTop: 13, minHeight: 20 }}>
          <Tally n={draftRoad} color={C.blossom} h={18} gap={6} max={14} />
        </div>

        <div
          style={{ marginTop: 12, fontSize: 13, color: C.sage, lineHeight: 1.45, fontStyle: "italic" }}
        >
          Does Bunny Road actually earn its title tonight?
        </div>
      </div>

      {/* when + conditions */}
      <div style={card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
          <Eyebrow>When you walked</Eyebrow>
          <span style={{ fontSize: 12, color: C.sage }}>
            {moonOf(draft.date).icon} {moonOf(draft.date).name}
          </span>
        </div>

        {(
          [
            ["Started", "time", "Start time"],
            ["Finished", "endTime", "End time"],
          ] as const
        ).map(([label, field, aria]) => (
          <div key={field} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11 }}>
            <span
              style={{
                width: 62,
                flexShrink: 0,
                font: "500 12px 'Azeret Mono', monospace",
                letterSpacing: ".1em",
                textTransform: "uppercase",
                color: C.sage,
              }}
            >
              {label}
            </span>
            <input
              type="time"
              value={draft[field]}
              aria-label={aria}
              onChange={(e) => setDraftField(field, e.target.value)}
              style={{
                flex: 1,
                minWidth: 0,
                padding: "12px 14px",
                borderRadius: 11,
                border: `1px solid ${C.sprig}`,
                background: C.moss,
                color: C.cream,
                fontSize: 16,
              }}
            />
            <button
              className="tap"
              onClick={() => {
                const d = new Date();
                const now = `${String(d.getHours()).padStart(2, "0")}:${String(
                  d.getMinutes(),
                ).padStart(2, "0")}`;
                setDraftField(field, now);
              }}
              style={{
                padding: "12px 14px",
                borderRadius: 11,
                flexShrink: 0,
                cursor: "pointer",
                border: `1px solid ${C.sprig}`,
                background: "transparent",
                color: C.mint,
                font: "600 13px 'Azeret Mono', monospace",
              }}
            >
              Now
            </button>
          </div>
        ))}

        {draft.time && draft.endTime && (
          <div
            style={{
              marginTop: 14,
              padding: "11px 14px",
              borderRadius: 11,
              background: "rgba(147,216,176,.1)",
              border: "1px solid rgba(147,216,176,.3)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 10,
            }}
          >
            <span style={{ fontSize: 14, color: C.cream }}>
              {fmtTime(draft.time)} → {fmtTime(draft.endTime)}
            </span>
            <span style={{ font: "700 15px 'Azeret Mono', monospace", color: C.mint, flexShrink: 0 }}>
              {fmtMins(minsBetween(draft.time, draft.endTime))}
            </span>
          </div>
        )}

        <div style={{ marginTop: 20 }}>
          <Eyebrow>Conditions</Eyebrow>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {WEATHER.map((w) => {
              const on = draft.weather === w.id;
              return (
                <button
                  key={w.id}
                  className="tap"
                  onClick={() => setDraftField("weather", on ? null : w.id)}
                  style={{
                    padding: "9px 13px",
                    borderRadius: 999,
                    cursor: "pointer",
                    border: `1px solid ${on ? C.mint : C.sprig}`,
                    background: on ? "rgba(147,216,176,.14)" : "transparent",
                    color: on ? C.mint : C.sage,
                    font: "500 13px 'Karla', sans-serif",
                  }}
                >
                  {w.icon} {w.label}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ marginTop: 20 }}>
          <Eyebrow>Walk date</Eyebrow>
          <input
            type="date"
            value={draft.date}
            max={today()}
            onChange={(e) => setDraftField("date", e.target.value)}
            style={{
              width: "100%",
              marginTop: 9,
              padding: "12px 14px",
              borderRadius: 11,
              border: `1px solid ${C.sprig}`,
              background: C.moss,
              color: C.cream,
              fontSize: 15,
            }}
          />
        </div>

        <div style={{ marginTop: 16 }}>
          <Eyebrow>Note (optional)</Eyebrow>
          <input
            value={draft.note}
            onChange={(e) => setDraftField("note", e.target.value)}
            placeholder="Two kits under the hedge…"
            style={{
              width: "100%",
              marginTop: 9,
              padding: "12px 14px",
              borderRadius: 11,
              border: `1px solid ${C.sprig}`,
              background: C.moss,
              color: C.cream,
              fontSize: 15,
              fontFamily: "'Karla', sans-serif",
            }}
          />
        </div>
      </div>

      <button
        onClick={() => {
          const beat = log.saveWalk();
          if (beat !== null) onSaved(beat);
        }}
        className="tap"
        style={{ ...primaryBtn, padding: "18px", fontSize: 17 }}
      >
        Save walk
      </button>
      <div style={{ textAlign: "center", fontSize: 12, color: C.sage, paddingBottom: 6 }}>
        Counts are kept as you tap, so you can close this mid-walk.
      </div>
    </main>
  );
}
