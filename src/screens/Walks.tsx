/* ── WALKS — reverse-chronological log, each entry editable in place ── */
import { useEffect, useState, type Dispatch, type SetStateAction } from "react";
import type { WalkLog } from "../hooks/useWalkLog";
import type { WalksForm } from "./forms";
import type { Walk } from "../types";
import { C, card, chip, ghostBtn, primaryBtn } from "../theme";
import { Eyebrow } from "../components/bits";
import { Tally } from "../components/Tally";
import { WEATHER } from "../data/constants";
import { addMins, fmtMins, fmtTime, prettyDate, today } from "../lib/time";
import { moonOf } from "../lib/moon";
import { sum } from "../lib/stats";

export function Walks({
  log,
  form,
  setForm,
}: {
  log: WalkLog;
  form: WalksForm;
  setForm: Dispatch<SetStateAction<WalksForm>>;
}) {
  const { walks, species } = log;
  const edit = form.edit;

  /* deleting is permanent — require a second tap within 3 seconds */
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  useEffect(() => {
    if (!confirmDelete) return;
    const t = setTimeout(() => setConfirmDelete(null), 3000);
    return () => clearTimeout(t);
  }, [confirmDelete]);

  /* a deleted custom critter's id like "skunk-x7q2" → "Skunk" */
  const prettyOrphan = (k: string) => {
    const base = k.replace(/-[a-z0-9]{4}$/, "").replace(/-/g, " ").trim();
    return base ? base[0].toUpperCase() + base.slice(1) : k;
  };

  const startEdit = (w: Walk) =>
    setForm({
      edit: {
        id: w.id,
        date: w.date,
        counts: { ...w.counts },
        road: w.road,
        time: w.time ?? "",
        endTime: w.endTime ?? "",
        weather: w.weather,
        note: w.note,
      },
    });

  const patchEdit = (p: Partial<NonNullable<WalksForm["edit"]>>) =>
    setForm((f) => (f.edit ? { edit: { ...f.edit, ...p } } : f));

  const bumpEdit = (id: string, delta: number) =>
    setForm((f) => {
      if (!f.edit) return f;
      const n = Math.max(0, (f.edit.counts[id] || 0) + delta);
      return { edit: { ...f.edit, counts: { ...f.edit.counts, [id]: n } } };
    });

  const miniBtn = (label: string, onClick: () => void, glyph: string) => (
    <button
      onClick={onClick}
      aria-label={label}
      className="tap"
      style={{
        width: 36,
        height: 36,
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
      {glyph}
    </button>
  );

  const editInput = {
    padding: "10px 12px",
    borderRadius: 10,
    border: `1px solid ${C.sprig}`,
    background: C.moss,
    color: C.cream,
    fontSize: 16,
  } as const;

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
        /* ── EDIT MODE ── */
        if (edit && edit.id === w.id) {
          // every current species, plus any counted critter that has since
          // been removed from the picker (its tally must stay editable)
          const rows = [
            ...species,
            ...Object.keys(edit.counts)
              .filter((k) => !species.some((s) => s.id === k))
              .map((k) => ({ id: k, name: prettyOrphan(k), icon: "🐾" })),
          ];
          return (
            <div key={w.id} style={{ ...card, borderColor: "rgba(147,216,176,.4)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <Eyebrow color={C.mint}>Editing walk</Eyebrow>
                <span style={{ fontSize: 13, color: C.sage }}>{prettyDate(edit.date)}</span>
              </div>

              <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
                {rows.map((s) => (
                  <div key={s.id} style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 18, width: 24, flexShrink: 0 }}>{s.icon}</span>
                    <span
                      style={{
                        flex: 1,
                        minWidth: 0,
                        fontSize: 14,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {s.name}
                    </span>
                    {miniBtn(`One fewer ${s.name}`, () => bumpEdit(s.id, -1), "−")}
                    <span
                      style={{
                        font: "700 17px 'Azeret Mono', monospace",
                        color: edit.counts[s.id] ? C.cream : C.sage,
                        minWidth: 28,
                        textAlign: "center",
                        flexShrink: 0,
                      }}
                    >
                      {edit.counts[s.id] || 0}
                    </span>
                    {miniBtn(`One more ${s.name}`, () => bumpEdit(s.id, 1), "+")}
                  </div>
                ))}

                <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                  <span style={{ fontSize: 18, width: 24, flexShrink: 0 }}>🚏</span>
                  <span style={{ flex: 1, minWidth: 0, fontSize: 14, color: C.blossom }}>
                    Bunny Road
                  </span>
                  {miniBtn("One fewer on Bunny Road", () => patchEdit({ road: Math.max(0, edit.road - 1) }), "−")}
                  <span
                    style={{
                      font: "700 17px 'Azeret Mono', monospace",
                      color: edit.road ? C.blossom : C.sage,
                      minWidth: 28,
                      textAlign: "center",
                      flexShrink: 0,
                    }}
                  >
                    {edit.road}
                  </span>
                  {miniBtn("One more on Bunny Road", () => patchEdit({ road: edit.road + 1 }), "+")}
                </div>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 14 }}>
                <input
                  type="time"
                  value={edit.time}
                  aria-label="Start time"
                  onChange={(e) => patchEdit({ time: e.target.value })}
                  style={{ ...editInput, flex: 1, minWidth: 0, textAlign: "center" }}
                />
                <span style={{ color: C.sage, flexShrink: 0 }}>→</span>
                <input
                  type="time"
                  value={edit.endTime}
                  aria-label="End time"
                  onChange={(e) => patchEdit({ endTime: e.target.value })}
                  style={{ ...editInput, flex: 1, minWidth: 0, textAlign: "center" }}
                />
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {WEATHER.map((cond) => {
                  const on = edit.weather === cond.id;
                  return (
                    <button
                      key={cond.id}
                      className="tap"
                      aria-pressed={on}
                      onClick={() => patchEdit({ weather: on ? null : cond.id })}
                      style={{
                        padding: "8px 12px",
                        borderRadius: 999,
                        cursor: "pointer",
                        minHeight: 36,
                        border: `1.5px solid ${on ? C.mint : C.sprig}`,
                        background: on ? "rgba(147,216,176,.16)" : "transparent",
                        color: on ? C.mint : C.sage,
                        font: "500 13px 'Karla', sans-serif",
                      }}
                    >
                      {cond.icon} {cond.label}
                    </button>
                  );
                })}
              </div>

              <input
                type="date"
                value={edit.date}
                max={today()}
                aria-label="Walk date"
                onChange={(e) => {
                  // Android's picker has a Clear action — an emptied date
                  // would re-date the walk to today on the next reload
                  if (e.target.value) patchEdit({ date: e.target.value });
                }}
                style={{ ...editInput, width: "100%", marginTop: 12 }}
              />
              <input
                value={edit.note}
                onChange={(e) => patchEdit({ note: e.target.value })}
                placeholder="Note (optional)"
                aria-label="Note"
                style={{ ...editInput, width: "100%", marginTop: 10, fontFamily: "'Karla', sans-serif" }}
              />

              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button
                  onClick={() => {
                    const { id, ...fields } = edit;
                    if (log.updateWalk(id, fields) !== null) setForm({ edit: null });
                  }}
                  className="tap"
                  style={{ ...primaryBtn, flex: 1, padding: "13px" }}
                >
                  Save changes
                </button>
                <button
                  onClick={() => setForm({ edit: null })}
                  className="tap"
                  style={{ ...ghostBtn, padding: "13px 18px" }}
                >
                  Cancel
                </button>
              </div>
            </div>
          );
        }

        /* ── DISPLAY MODE ── */
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

            <div style={{ display: "flex", gap: 14, marginTop: 12, alignItems: "center" }}>
              {/* one edit at a time — a second Edit link would silently
                  discard the open edit's unsaved changes */}
              {!edit && (
                <button
                  onClick={() => startEdit(w)}
                  style={{
                    background: "none",
                    border: "none",
                    color: C.mint,
                    font: "500 12px 'Azeret Mono', monospace",
                    letterSpacing: ".08em",
                    cursor: "pointer",
                    padding: "8px 10px",
                    margin: "0 -10px",
                    minHeight: 34,
                    textTransform: "uppercase",
                  }}
                >
                  Edit
                </button>
              )}
              <button
                onClick={() => {
                  if (confirmDelete === w.id) {
                    setConfirmDelete(null);
                    log.deleteWalk(w.id);
                  } else {
                    setConfirmDelete(w.id);
                  }
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: confirmDelete === w.id ? C.blossom : C.sage,
                  font: `${confirmDelete === w.id ? "700" : "500"} 12px 'Azeret Mono', monospace`,
                  letterSpacing: ".08em",
                  cursor: "pointer",
                  padding: "8px 10px",
                  margin: "0 -10px",
                  minHeight: 34,
                  textTransform: "uppercase",
                }}
              >
                {confirmDelete === w.id ? "Tap again to delete" : "Delete walk"}
              </button>
            </div>
          </div>
        );
      })}
    </main>
  );
}
