/* ── TONIGHT — the counting screen, ported exactly ──────────── */
import {
  useEffect,
  useState,
  type CSSProperties,
  type Dispatch,
  type SetStateAction,
} from "react";
import type { WalkLog } from "../hooks/useWalkLog";
import type { TonightForm } from "./forms";
import { C, card, ghostBtn, primaryBtn } from "../theme";
import { Eyebrow, StepButton } from "../components/bits";
import { Tally } from "../components/Tally";
import { ICONS, WEATHER } from "../data/constants";
import { fmtMins, fmtTime, minsBetween, today } from "../lib/time";
import { moonOf } from "../lib/moon";
import { duskPhase, sunsetAt } from "../lib/sun";

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

  /* time-based re-render: every 30s while the timer runs OR while the
     dusk strip is shown (its phrasing tracks the clock), plus a bump
     whenever the app is resumed from the background — otherwise a
     backgrounded PWA shows a passed sunset as still upcoming */
  const walking = draft.walking === true;
  const hasLocation = log.prefs.lat != null && log.prefs.lon != null;
  const [, setTick] = useState(0);
  useEffect(() => {
    if (!walking && !hasLocation) return;
    const t = setInterval(() => setTick((x) => x + 1), 30_000);
    return () => clearInterval(t);
  }, [walking, hasLocation]);
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === "visible") setTick((x) => x + 1);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => document.removeEventListener("visibilitychange", onVisible);
  }, []);
  const nowHHMM = () => {
    const d = new Date();
    return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  };
  const elapsed = walking && draft.time ? minsBetween(draft.time, nowHHMM()) : 0;
  const showTimes = !walking && (Boolean(draft.time) || Boolean(draft.endTime) || form.manualTimes);
  const bothTimes = Boolean(draft.time && draft.endTime);

  const timePill: CSSProperties = {
    width: 108,
    flexShrink: 0,
    padding: "11px 8px",
    borderRadius: 12,
    textAlign: "center",
    border: `1px solid ${C.sprig}`,
    background: C.fern,
    color: C.cream,
    fontSize: 16, // <16px makes mobile Safari auto-zoom on focus
  };

  const sunset = hasLocation ? sunsetAt(log.prefs.lat!, log.prefs.lon!, today()) : null;
  const sunsetLine = (() => {
    if (!sunset) return null;
    const hhmm = `${String(sunset.getHours()).padStart(2, "0")}:${String(sunset.getMinutes()).padStart(2, "0")}`;
    const phase = duskPhase(sunset);
    if (phase === "before") return `🌇 Sunset at ${fmtTime(hhmm)} tonight`;
    if (phase === "prime") return `🌇 Sunset ${fmtTime(hhmm)} — prime critter hours`;
    return `🌙 Sunset was ${fmtTime(hhmm)}`;
  })();

  return (
    <main style={{ padding: "18px 20px 0", display: "grid", gap: 14 }} className="fade">
      {/* dusk line — sunset computed on-device from cached location */}
      {sunsetLine ? (
        <div
          style={{
            textAlign: "center",
            fontSize: 13,
            color: duskPhase(sunset!) === "prime" ? C.mint : C.sage,
            fontFamily: "'Azeret Mono', monospace",
            padding: "2px 0",
          }}
        >
          {sunsetLine}
        </div>
      ) : (
        log.prefs.lat == null && (
          <button
            onClick={() => log.useMyLocation()}
            className="tap"
            style={{
              background: "none",
              border: `1px dashed ${C.sprig}`,
              borderRadius: 12,
              cursor: "pointer",
              minHeight: 38,
              padding: "9px 12px",
              color: C.sage,
              font: "500 13px 'Karla', sans-serif",
            }}
          >
            🌇 Show tonight's sunset time — uses your location, once, kept on this phone
          </button>
        )
      )}

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

        {/* ONE button: Start walk ↔ Stop walk (live elapsed while out) */}
        {!walking ? (
          <button
            onClick={() => log.startWalk()}
            className="tap"
            style={{ ...primaryBtn, width: "100%", marginTop: 13, padding: "16px", fontSize: 16 }}
          >
            {/* U+25B8, not U+25B6 — the latter is emoji-eligible and
                renders as a color emoji on Android, ignoring our color */}
            ▸ &nbsp;Start walk
          </button>
        ) : (
          <button
            onClick={() => log.stopWalk()}
            className="tap"
            style={{
              width: "100%",
              marginTop: 13,
              padding: "16px",
              borderRadius: 13,
              cursor: "pointer",
              border: `1.5px solid ${C.blossom}`,
              background: "rgba(244,167,185,.12)",
              color: C.blossom,
              font: "700 16px 'Karla', sans-serif",
            }}
          >
            ■ &nbsp;Stop walk
            {elapsed > 0 && (
              <span style={{ fontFamily: "'Azeret Mono', monospace" }}> · {fmtMins(elapsed)}</span>
            )}
          </button>
        )}

        {walking && draft.time && (
          <div style={{ marginTop: 9, textAlign: "center", fontSize: 13, color: C.sage }}>
            started {fmtTime(draft.time)} — counts still tap while you walk
          </div>
        )}

        {/* the recorded times as one connected piece — tap either end to fix it */}
        {showTimes && (
          <>
            <div style={{ display: "flex", alignItems: "center", marginTop: 14 }}>
              <input
                type="time"
                value={draft.time}
                aria-label="Start time"
                onChange={(e) => setDraftField("time", e.target.value)}
                style={timePill}
              />
              <div
                style={{
                  flex: 1,
                  minWidth: 14,
                  height: 2,
                  background: C.sprig,
                  position: "relative",
                  margin: "0 -1px",
                }}
              >
                <span style={{ position: "absolute", left: 0, top: -3, width: 8, height: 8, borderRadius: "50%", background: C.mint }} />
                <span style={{ position: "absolute", right: 0, top: -3, width: 8, height: 8, borderRadius: "50%", background: C.mint }} />
              </div>
              <input
                type="time"
                value={draft.endTime}
                aria-label="End time"
                onChange={(e) => setDraftField("endTime", e.target.value)}
                style={timePill}
              />
            </div>
            {bothTimes && (
              <div style={{ marginTop: 10, textAlign: "center" }}>
                <span
                  style={{
                    display: "inline-block",
                    padding: "5px 13px",
                    borderRadius: 999,
                    border: "1px solid rgba(147,216,176,.35)",
                    color: C.mint,
                    font: "600 13px 'Azeret Mono', monospace",
                  }}
                >
                  {fmtTime(draft.time)} → {fmtTime(draft.endTime)} · {fmtMins(minsBetween(draft.time, draft.endTime))}
                </span>
              </div>
            )}
          </>
        )}

        {!walking && !showTimes && (
          <div style={{ marginTop: 9, textAlign: "center" }}>
            <button
              onClick={() => setForm((f) => ({ ...f, manualTimes: true }))}
              style={{
                background: "none",
                border: "none",
                cursor: "pointer",
                minHeight: 34,
                color: C.sage,
                font: "500 13px 'Karla', sans-serif",
                textDecoration: "underline",
                textUnderlineOffset: 3,
              }}
            >
              Enter times myself (for last night's walk)
            </button>
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
          if (beat !== null) {
            // fold the manual time pills back up for the next fresh draft
            setForm((f) => ({ ...f, manualTimes: false }));
            onSaved(beat);
          }
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
