/* ── PATTERNS — records, stats, backup; ported + backup upgrades ── */
import { useMemo, type Dispatch, type SetStateAction } from "react";
import type { WalkLog } from "../hooks/useWalkLog";
import type { PatternsForm } from "./forms";
import { C, card, ghostBtn, primaryBtn } from "../theme";
import { Eyebrow } from "../components/bits";
import { Tally } from "../components/Tally";
import { fmtMins, hourLabel, prettyDate, today } from "../lib/time";
import { moonOf } from "../lib/moon";
import { plural } from "../lib/plural";
import { SEASONS, seasonOf } from "../lib/season";
import { computeStats, sum } from "../lib/stats";
import { daysSince } from "../lib/backup";

export function Patterns({
  log,
  form,
  setForm,
}: {
  log: WalkLog;
  form: PatternsForm;
  setForm: Dispatch<SetStateAction<PatternsForm>>;
}) {
  const { walks, species, records } = log;
  const { backupText, restoreOpen, restoreText, safetyOpen } = form;
  const setBackupText = (backupText: string) => setForm((f) => ({ ...f, backupText }));
  const setRestoreOpen = (v: boolean | ((prev: boolean) => boolean)) =>
    setForm((f) => ({ ...f, restoreOpen: typeof v === "function" ? v(f.restoreOpen) : v }));
  const setRestoreText = (restoreText: string) => setForm((f) => ({ ...f, restoreText }));
  const setSafetyOpen = (v: boolean | ((prev: boolean) => boolean)) =>
    setForm((f) => ({ ...f, safetyOpen: typeof v === "function" ? v(f.safetyOpen) : v }));

  const stats = useMemo(() => computeStats(walks), [walks]);
  const exportAge = daysSince(log.lastExport);

  /* plain functions, not components — keeps the inputs from losing focus mid-type */
  const bigRecord = (k: string, icon: string, label: string) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <Eyebrow color={C.blossom}>{label}</Eyebrow>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 11 }}>
        <input
          value={records[k]?.value ?? 0}
          inputMode="numeric"
          aria-label={label}
          onChange={(e) => log.setRecord(k, e.target.value)}
          onFocus={(e) => e.target.select()}
          style={{
            width: 92,
            flexShrink: 0,
            padding: "8px 10px",
            borderRadius: 11,
            textAlign: "center",
            border: "1px solid rgba(244,167,185,.32)",
            background: "rgba(14,31,23,.55)",
            color: C.blossom,
            font: "700 32px 'Azeret Mono', monospace",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tally n={records[k]?.value || 0} color={C.blossom} h={15} gap={5} max={10} />
        </div>
      </div>
      <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 12, color: C.sage, flexShrink: 0 }}>Set on</span>
        <input
          type="date"
          value={records[k]?.date || ""}
          max={today()}
          aria-label={`Date of ${label}`}
          onChange={(e) => log.setRecordDate(k, e.target.value)}
          style={{
            flex: 1,
            minWidth: 0,
            padding: "7px 10px",
            borderRadius: 9,
            fontSize: 13,
            border: "1px solid rgba(244,167,185,.22)",
            background: "rgba(14,31,23,.5)",
            color: records[k]?.date ? C.cream : C.sage,
          }}
        />
        {records[k]?.date && (
          <span style={{ fontSize: 14, flexShrink: 0 }} title={moonOf(records[k].date).name}>
            {moonOf(records[k].date).icon}
          </span>
        )}
      </div>
    </div>
  );

  const smallRecord = (k: string, icon: string, label: string, fmt?: (n: number) => string) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ fontSize: 17, width: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>{label}</div>
        {fmt && (
          <div style={{ fontSize: 12, color: C.sage, marginTop: 1 }}>
            {fmt(records[k]?.value || 0)}
          </div>
        )}
      </div>
      <input
        value={records[k]?.value ?? 0}
        inputMode="numeric"
        aria-label={label}
        onChange={(e) => log.setRecord(k, e.target.value)}
        onFocus={(e) => e.target.select()}
        style={{
          width: 68,
          flexShrink: 0,
          padding: "8px 6px",
          borderRadius: 10,
          textAlign: "center",
          border: `1px solid ${C.sprig}`,
          background: C.moss,
          color: C.cream,
          font: "700 17px 'Azeret Mono', monospace",
        }}
      />
    </div>
  );

  return (
    <main style={{ padding: "18px 20px 0", display: "grid", gap: 14 }} className="fade">
      {/* records — editable at any time, no walk required */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div
          style={{
            font: "700 21px 'Fraunces', Georgia, serif",
            fontVariationSettings: '"SOFT" 30, "WONK" 1',
          }}
        >
          Records
        </div>
        <span style={{ fontSize: 12, color: C.sage }}>Tap a number to change it</span>
      </div>

      <div
        style={{
          ...card,
          display: "grid",
          gap: 18,
          background: "linear-gradient(160deg, rgba(244,167,185,.13), rgba(23,51,40,.6))",
          borderColor: "rgba(244,167,185,.35)",
        }}
      >
        {bigRecord("rabbit", "🐇", "Most bunnies in one night")}
        <div style={{ height: 1, background: "rgba(244,167,185,.2)" }} />
        {bigRecord("road", "🚏", "Most bunnies on Bunny Road")}
      </div>

      <div style={{ ...card, display: "grid", gap: 16 }}>
        <Eyebrow>Everything else</Eyebrow>
        {/* an animal earns its row at a record of 2+ — one stray sighting
            (or a zero) doesn't clutter the list; it appears automatically
            once a saved walk beats 1 */}
        {species
          .filter((s) => s.id !== "rabbit" && (records[s.id]?.value ?? 0) >= 2)
          .map((s) => smallRecord(s.id, s.icon, `Most ${plural(s.name).toLowerCase()}`))}
        <div style={{ height: 1, background: C.sprig }} />
        {smallRecord("duration", "⏱", "Longest walk (minutes)", fmtMins)}
      </div>

      <div style={{ height: 6 }} />

      {walks.length === 0 ? (
        <div style={{ ...card, padding: 26, textAlign: "center" }}>
          <div style={{ fontSize: 30 }}>📓</div>
          <div style={{ marginTop: 10, font: "600 17px 'Fraunces', Georgia, serif" }}>
            No walks logged yet
          </div>
          <div style={{ color: C.sage, fontSize: 14, marginTop: 6 }}>
            Your records are saved above. Log a few evenings and the rest of the patterns fill in
            here.
          </div>
        </div>
      ) : (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
            {(
              [
                ["Walks", walks.length, C.cream, 24],
                ["Critters", stats.totalCritters, C.mint, 24],
                ["Time out", fmtMins(stats.totalMins), C.cream, 19],
              ] as const
            ).map(([label, val, col, fs]) => (
              <div key={label} style={{ ...card, padding: 14, textAlign: "center" }}>
                <div style={{ font: `700 ${fs}px 'Azeret Mono', monospace`, color: col }}>{val}</div>
                <div style={{ marginTop: 4 }}>
                  <Eyebrow>{label}</Eyebrow>
                </div>
              </div>
            ))}
          </div>

          {/* the headline stat */}
          <div
            style={{
              ...card,
              background: "linear-gradient(160deg, rgba(244,167,185,.14), rgba(23,51,40,.6))",
              borderColor: "rgba(244,167,185,.35)",
            }}
          >
            <Eyebrow color={C.blossom}>The road's reputation, all-time</Eyebrow>
            <div
              style={{
                marginTop: 12,
                font: "700 44px 'Azeret Mono', monospace",
                color: C.blossom,
                lineHeight: 1,
              }}
            >
              {stats.roadTotal}
            </div>
            <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>
              bunnies on Bunny Road across {stats.roadNights}{" "}
              {stats.roadNights === 1 ? "evening" : "evenings"}
              {stats.roadNights > 0 && (
                <span style={{ color: C.sage }}>
                  {" "}
                  — {(stats.roadTotal / stats.roadNights).toFixed(1)} a night on average.
                </span>
              )}
            </div>
            {stats.rab > 0 && (
              <div
                style={{
                  marginTop: 14,
                  paddingTop: 13,
                  borderTop: "1px solid rgba(244,167,185,.22)",
                  fontSize: 14,
                  color: C.sage,
                }}
              >
                Your overall rabbit tally is{" "}
                <span
                  style={{ color: C.cream, fontFamily: "'Azeret Mono', monospace", fontWeight: 700 }}
                >
                  {stats.rab}
                </span>{" "}
                — counted separately.
              </div>
            )}
            {stats.bestRoad && stats.bestRoad.road > 0 && (
              <div style={{ marginTop: 12, fontSize: 14 }}>
                Best night on the road:{" "}
                <span style={{ color: C.blossom, fontWeight: 700 }}>
                  {prettyDate(stats.bestRoad.date)}
                </span>{" "}
                with {stats.bestRoad.road}.
              </div>
            )}
          </div>

          {/* species ranking */}
          <div style={card}>
            <Eyebrow>All-time by critter</Eyebrow>
            <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
              {species
                .map((s) => ({ ...s, n: stats.perSpecies[s.id] || 0 }))
                .sort((a, b) => b.n - a.n)
                .map((s) => {
                  const top = Math.max(...Object.values(stats.perSpecies), 1);
                  return (
                    <div key={s.id}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                          marginBottom: 6,
                        }}
                      >
                        <span>
                          {s.icon} {plural(s.name)}
                        </span>
                        <span
                          style={{
                            font: "600 14px 'Azeret Mono', monospace",
                            color: s.n ? C.cream : C.sage,
                          }}
                        >
                          {s.n}
                        </span>
                      </div>
                      <div
                        style={{ height: 7, borderRadius: 99, background: C.moss, overflow: "hidden" }}
                      >
                        <div
                          style={{
                            width: `${(s.n / top) * 100}%`,
                            height: "100%",
                            borderRadius: 99,
                            background: s.id === "rabbit" ? C.blossom : C.mint,
                            transition: "width .5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* recent nights */}
          <div style={card}>
            <Eyebrow>Last 14 walks</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 5, height: 92, marginTop: 16 }}>
              {walks
                .slice(0, 14)
                .reverse()
                .map((w) => {
                  const t = sum(w.counts);
                  const top = Math.max(...walks.slice(0, 14).map((x) => sum(x.counts)), 1);
                  return (
                    <div
                      key={w.id}
                      title={`${prettyDate(w.date)} · ${t}`}
                      style={{
                        flex: 1,
                        height: `${Math.max((t / top) * 100, 4)}%`,
                        borderRadius: "4px 4px 2px 2px",
                        background: w.road > 0 ? C.blossom : C.mint,
                        opacity: 0.85,
                      }}
                    />
                  );
                })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
              <Eyebrow>Older</Eyebrow>
              <Eyebrow>Latest</Eyebrow>
            </div>
          </div>

          {stats.hourRows.length > 0 && (
            <div style={card}>
              <Eyebrow>Average sightings by start time</Eyebrow>
              <div style={{ display: "grid", gap: 12, marginTop: 14 }}>
                {stats.hourRows.map((r) => {
                  const top = Math.max(...stats.hourRows.map((x) => x.avg), 1);
                  return (
                    <div key={r.h}>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          fontSize: 14,
                          marginBottom: 6,
                        }}
                      >
                        <span>
                          {hourLabel(r.h)}
                          <span style={{ color: C.sage, fontSize: 12 }}>
                            {" "}
                            · {r.n} {r.n === 1 ? "walk" : "walks"}
                          </span>
                        </span>
                        <span style={{ font: "600 14px 'Azeret Mono', monospace" }}>
                          {r.avg.toFixed(1)}
                        </span>
                      </div>
                      <div
                        style={{ height: 7, borderRadius: 99, background: C.moss, overflow: "hidden" }}
                      >
                        <div
                          style={{
                            width: `${(r.avg / top) * 100}%`,
                            height: "100%",
                            borderRadius: 99,
                            background: C.blossom,
                            transition: "width .5s ease",
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
              {stats.hourRows.length < 2 && (
                <div style={{ marginTop: 13, fontSize: 13, color: C.sage }}>
                  Log walks at a few different times and this will start telling you something.
                </div>
              )}
            </div>
          )}

          {stats.weatherRows.length > 0 && (
            <div style={card}>
              <Eyebrow>Average sightings by conditions</Eyebrow>
              <div style={{ display: "grid", gap: 11, marginTop: 14 }}>
                {stats.weatherRows.map((r) => (
                  <div key={r.id} style={{ display: "flex", alignItems: "center", gap: 11 }}>
                    <span style={{ fontSize: 16, width: 22, flexShrink: 0 }}>{r.icon}</span>
                    <span style={{ flex: 1, minWidth: 0, fontSize: 14 }}>
                      {r.label}
                      <span style={{ color: C.sage, fontSize: 12 }}> · {r.n}</span>
                    </span>
                    <span style={{ font: "600 15px 'Azeret Mono', monospace", color: C.mint }}>
                      {r.avg.toFixed(1)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {stats.best && (
            <div style={card}>
              <Eyebrow>Busiest evening</Eyebrow>
              <div
                style={{
                  marginTop: 8,
                  font: "600 19px 'Fraunces', Georgia, serif",
                  fontVariationSettings: '"SOFT" 30, "WONK" 1',
                }}
              >
                {prettyDate(stats.best.date)} — {sum(stats.best.counts)} critters
              </div>
              <div style={{ marginTop: 10 }}>
                <Tally n={sum(stats.best.counts)} color={C.blossom} h={19} max={16} />
              </div>
            </div>
          )}

          {stats.totalMins > 0 && (
            <div style={{ ...card, textAlign: "center", color: C.sage, fontSize: 14 }}>
              That's{" "}
              <span
                style={{ color: C.mint, fontWeight: 700, fontFamily: "'Azeret Mono', monospace" }}
              >
                {(stats.totalCritters / (stats.totalMins / 60)).toFixed(1)}
              </span>{" "}
              critters an hour of walking.
            </div>
          )}
        </>
      )}

      {/* scenery — the forest follows the calendar unless pinned */}
      <div style={card}>
        <Eyebrow>Scenery</Eyebrow>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 11 }}>
          {[
            {
              id: "auto" as const,
              icon: "🍃",
              label: `Auto · ${SEASONS.find((x) => x.id === seasonOf(today()))!.label}`,
            },
            ...SEASONS.map((s) => ({ id: s.id as "auto" | typeof s.id, icon: s.icon, label: s.label })),
          ].map((s) => {
            const on = log.prefs.season === s.id;
            return (
              <button
                key={s.id}
                className="tap"
                aria-pressed={on}
                onClick={() => log.setSeason(s.id)}
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
                {s.icon} {s.label}
              </button>
            );
          })}
        </div>
        <div style={{ marginTop: 10, fontSize: 12, color: C.sage }}>
          Changes the forest at the top of the app. Auto follows the calendar.
        </div>
      </div>

      {/* backup — real files now, clipboard kept for artefact compatibility */}
      <div style={{ height: 6 }} />
      <div style={{ ...card, borderStyle: "dashed" }}>
        <Eyebrow>Backup</Eyebrow>
        <div style={{ fontSize: 13, color: C.sage, marginTop: 9, lineHeight: 1.5 }}>
          Download a backup file every so often and tuck it into Google Drive — that copy survives
          anything that happens to this phone or app.
          {exportAge == null
            ? " You haven't exported one yet."
            : exportAge > 14
              ? ` It's been ${exportAge} days since your last one.`
              : ""}
        </div>

        <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
          <button
            onClick={() => log.downloadBackup()}
            className="tap"
            style={{ ...primaryBtn, flex: 1, padding: "13px" }}
          >
            Download backup
          </button>
          <button
            onClick={() => setRestoreOpen((v) => !v)}
            className="tap"
            style={{ ...ghostBtn, padding: "13px 18px" }}
          >
            {restoreOpen ? "Cancel" : "Restore"}
          </button>
        </div>

        <button
          onClick={async () => setBackupText(await log.copyBackup())}
          className="tap"
          style={{ ...ghostBtn, width: "100%", marginTop: 9, padding: "12px" }}
        >
          Copy backup to clipboard
        </button>

        {backupText && !restoreOpen && (
          <textarea
            readOnly
            value={backupText}
            onFocus={(e) => e.target.select()}
            aria-label="Backup text"
            style={{
              width: "100%",
              height: 80,
              marginTop: 11,
              padding: "10px 12px",
              borderRadius: 10,
              resize: "vertical",
              border: `1px solid ${C.sprig}`,
              background: C.moss,
              color: C.sage,
              font: "400 11px 'Azeret Mono', monospace",
            }}
          />
        )}

        {restoreOpen && (
          <div style={{ marginTop: 13 }}>
            <button
              onClick={() => log.importFromFile()}
              className="tap"
              style={{ ...primaryBtn, width: "100%", padding: "13px" }}
            >
              Restore from a backup file…
            </button>
            <div style={{ textAlign: "center", fontSize: 12, color: C.sage, margin: "10px 0" }}>
              — or paste a copied backup —
            </div>
            <textarea
              value={restoreText}
              onChange={(e) => setRestoreText(e.target.value)}
              placeholder="Paste your backup here"
              aria-label="Paste backup to restore"
              style={{
                width: "100%",
                height: 90,
                padding: "10px 12px",
                borderRadius: 10,
                resize: "vertical",
                border: `1px solid ${C.sprig}`,
                background: C.moss,
                color: C.cream,
                font: "400 12px 'Azeret Mono', monospace",
              }}
            />
            <div style={{ fontSize: 12, color: C.sage, margin: "9px 0 11px" }}>
              This replaces everything currently in the app — and it's undoable below.
            </div>
            <button
              onClick={() => {
                if (log.restoreFromText(restoreText)) {
                  setRestoreOpen(false);
                  setRestoreText("");
                }
              }}
              className="tap"
              style={{ ...primaryBtn, width: "100%", padding: "13px" }}
            >
              Restore from pasted backup
            </button>
          </div>
        )}
      </div>

      {/* safety net — automatic snapshots + undo for restores */}
      <div style={{ ...card, borderStyle: "dashed" }}>
        <button
          onClick={() => setSafetyOpen((v) => !v)}
          className="tap"
          style={{
            background: "none",
            border: "none",
            padding: 0,
            minHeight: 34, // spec: every tap target ≥ 34px
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            cursor: "pointer",
            color: C.sage,
          }}
        >
          <Eyebrow>Safety net</Eyebrow>
          <span style={{ fontSize: 12, color: C.sage }}>{safetyOpen ? "Hide" : "Show"}</span>
        </button>

        {safetyOpen && (
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: 13, color: C.sage, lineHeight: 1.5 }}>
              The app keeps automatic daily snapshots of your log. If anything ever looks wrong,
              restore one — restoring is itself undoable.
            </div>

            {log.snapshots.length === 0 && (
              <div style={{ fontSize: 13, color: C.sage, marginTop: 10, fontStyle: "italic" }}>
                No snapshots yet — they appear after your first day of use.
              </div>
            )}
            {log.snapshots.map((s) => (
              <div
                key={s.date}
                style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}
              >
                <span style={{ flex: 1, minWidth: 0, fontSize: 13 }}>
                  {prettyDate(s.date)}
                  <span style={{ color: C.sage }}>
                    {" "}
                    · {s.walkCount} {s.walkCount === 1 ? "walk" : "walks"}
                  </span>
                </span>
                <button
                  onClick={() => log.restoreSnapshot(s.date)}
                  className="tap"
                  style={{ ...ghostBtn, padding: "9px 13px", fontSize: 13, minHeight: 34, flexShrink: 0 }}
                >
                  Restore
                </button>
              </div>
            ))}

            {log.preRestores.length > 0 && (
              <div style={{ marginTop: 14, paddingTop: 12, borderTop: `1px solid ${C.sprig}` }}>
                <Eyebrow>Undo a restore</Eyebrow>
                {log.preRestores.map((p) => (
                  <div
                    key={p.ts}
                    style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10 }}
                  >
                    <span style={{ flex: 1, minWidth: 0, fontSize: 13, color: C.sage }}>
                      Before restore · {p.walkCount} {p.walkCount === 1 ? "walk" : "walks"}
                    </span>
                    <button
                      onClick={() => log.undoRestore(p.ts)}
                      className="tap"
                      style={{ ...ghostBtn, padding: "9px 13px", fontSize: 13, minHeight: 34, flexShrink: 0 }}
                    >
                      Bring back
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
