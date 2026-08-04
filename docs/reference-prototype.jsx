import { useState, useEffect, useRef, useMemo } from "react";

/* ── palette: mossy evening, blossom, mint ──────────────────── */
const C = {
  moss: "#0E1F17",
  fern: "#173328",
  sprig: "#234836",
  cream: "#F0EBDA",
  blossom: "#F4A7B9",
  mint: "#93D8B0",
  sage: "#7FA08D",
};

const STORE_KEY = "bunnyroad-log-v1";
const DRAFT_KEY = "bunnyroad-draft-v1";

const DEFAULT_SPECIES = [
  { id: "rabbit", name: "Rabbit", icon: "🐇" },
  { id: "raccoon", name: "Raccoon", icon: "🦝" },
  { id: "turkey", name: "Wild turkey", icon: "🦃" },
  { id: "cat", name: "Cat", icon: "🐈" },
];

const ICONS = ["🦌", "🦊", "🦨", "🐿️", "🦫", "🐦", "🦉", "🦆", "🐸", "🐢", "🦇", "🐺", "🦡", "🐻"];

/* standing bests — editable, and beaten automatically by a logged walk */
const SEED_RECORDS = {
  rabbit: { value: 25, date: "2026-07-24" },
  road: { value: 11, date: "2026-08-02" },
  turkey: { value: 2, date: null },
  raccoon: { value: 2, date: null },
  duration: { value: 90, date: null },
};

const fmtMins = (m) => {
  const n = Math.max(0, Math.round(m || 0));
  if (!n) return "—";
  const h = Math.floor(n / 60);
  const mm = n % 60;
  if (!h) return `${mm}m`;
  return mm ? `${h}h ${mm}m` : `${h}h`;
};

/* "19:15" → "7:15 pm" */
const fmtTime = (t) => {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${ap}`;
};

const addMins = (t, mins) => {
  if (!t || !mins) return "";
  const [h, m] = t.split(":").map(Number);
  const total = (h * 60 + m + mins) % 1440;
  return `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;
};

/* walk length from start and end, wrapping if the walk crosses midnight */
const minsBetween = (start, end) => {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  let diff = (eh * 60 + em) - (sh * 60 + sm);
  if (diff < 0) diff += 1440;
  return diff;
};

const hourLabel = (h) => {
  const ap = h >= 12 ? "pm" : "am";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh} ${ap}`;
};

const WEATHER = [
  { id: "clear", icon: "☀️", label: "Clear" },
  { id: "cloudy", icon: "☁️", label: "Cloudy" },
  { id: "rain", icon: "🌧", label: "Rain" },
  { id: "snow", icon: "❄️", label: "Snow" },
  { id: "windy", icon: "💨", label: "Windy" },
];

/* moon phase from the date alone — nothing for you to enter */
const MOONS = [
  { icon: "🌑", name: "New moon" },
  { icon: "🌒", name: "Waxing crescent" },
  { icon: "🌓", name: "First quarter" },
  { icon: "🌔", name: "Waxing gibbous" },
  { icon: "🌕", name: "Full moon" },
  { icon: "🌖", name: "Waning gibbous" },
  { icon: "🌗", name: "Last quarter" },
  { icon: "🌘", name: "Waning crescent" },
];

const SYNODIC = 29.530588853;

const moonOf = (iso) => {
  if (!iso) return MOONS[0];
  const [y, m, d] = iso.split("-").map(Number);
  const days = Date.UTC(y, m - 1, d, 21) / 86400000;
  const ref = Date.UTC(2000, 0, 6, 18, 14) / 86400000;
  const age = (((days - ref) % SYNODIC) + SYNODIC) % SYNODIC;
  return MOONS[Math.floor((age / SYNODIC) * 8 + 0.5) % 8];
};

const today = () => new Date().toISOString().slice(0, 10);

const IRREGULAR = { deer: "deer", moose: "moose", sheep: "sheep", fish: "fish", mouse: "mice", goose: "geese" };

/* pluralises the last word only, so "wild turkey" → "wild turkeys" */
const plural = (name) => {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() || "";
  const lower = last.toLowerCase();
  let out;
  if (IRREGULAR[lower]) out = IRREGULAR[lower];
  else if (/[^aeiou]y$/i.test(last)) out = last.slice(0, -1) + "ies";
  else if (/(s|x|z|ch|sh)$/i.test(last)) out = last + "es";
  else if (/fe$/i.test(last)) out = last.slice(0, -2) + "ves";
  else if (/[^f]f$/i.test(last)) out = last.slice(0, -1) + "ves";
  else out = last + "s";
  return [...parts, out].join(" ");
};

const countOf = (n, name) => `${n} ${(n === 1 ? name : plural(name)).toLowerCase()}`;

const prettyDate = (iso) => {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
};

const sum = (obj) => Object.values(obj || {}).reduce((a, b) => a + (b || 0), 0);

/* Bunny Road is stored as a plain number; older walks stored it per-species */
const roadOf = (w) => (typeof w.road === "number" ? w.road : sum(w.road));

/* ── signature element: five-bar gate tally marks ───────────── */
const jitter = (seed) => {
  const x = Math.sin(seed * 127.1) * 43758.5453;
  return (x - Math.floor(x) - 0.5) * 1.6;
};

function Tally({ n, color = C.cream, h = 22, gap = 7, max = 24 }) {
  const total = Math.max(0, Math.round(n));
  const shown = Math.min(total, max * 5);
  const groups = [];
  const full = Math.floor(shown / 5);
  for (let i = 0; i < full; i++) groups.push(5);
  if (shown % 5) groups.push(shown % 5);

  if (total === 0) return <span style={{ color: C.sage, fontSize: h * 0.6 }}>—</span>;

  return (
    <span style={{ display: "inline-flex", flexWrap: "wrap", gap: `${gap * 0.6}px ${gap}px`, alignItems: "center" }}>
      {groups.map((count, gi) => (
        <svg key={gi} width={h * 1.12} height={h} viewBox="0 0 25 22" style={{ overflow: "visible", flexShrink: 0 }}>
          {Array.from({ length: Math.min(count, 4) }).map((_, si) => {
            const x = 3.5 + si * 5.2 + jitter(gi * 9 + si);
            return (
              <line
                key={si}
                className="tk"
                x1={x} y1={2 + jitter(gi + si * 3)} x2={x + jitter(si * 7 + gi)} y2={20 + jitter(gi * 2 + si)}
                stroke={color} strokeWidth="2.1" strokeLinecap="round" pathLength="1"
              />
            );
          })}
          {count === 5 && (
            <line
              className="tk" x1="0.5" y1="19.5" x2="22" y2="2.5"
              stroke={color} strokeWidth="2.1" strokeLinecap="round" pathLength="1"
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

/* ── small pieces ───────────────────────────────────────────── */
const Eyebrow = ({ children, color = C.sage }) => (
  <div style={{ font: "500 11px 'Azeret Mono', monospace", letterSpacing: ".14em", textTransform: "uppercase", color }}>
    {children}
  </div>
);

function StepButton({ onClick, children, tone = "quiet", label }) {
  const isGo = tone === "go";
  return (
    <button
      onClick={onClick}
      aria-label={label}
      style={{
        width: isGo ? 54 : 42, height: isGo ? 54 : 42, borderRadius: 999, flexShrink: 0,
        border: `1.5px solid ${isGo ? "transparent" : C.sprig}`,
        background: isGo ? C.blossom : "transparent",
        color: isGo ? C.moss : C.sage,
        font: `500 ${isGo ? 27 : 20}px 'Karla', sans-serif`, lineHeight: 1,
        display: "grid", placeItems: "center", cursor: "pointer", touchAction: "manipulation",
        WebkitTapHighlightColor: "transparent",
      }}
      className="tap"
    >
      {children}
    </button>
  );
}

/* ── app ────────────────────────────────────────────────────── */
export default function CritterCounter() {
  const [view, setView] = useState("tonight");
  const [ready, setReady] = useState(false);
  const [err, setErr] = useState("");
  const [walks, setWalks] = useState([]);
  const [species, setSpecies] = useState(DEFAULT_SPECIES);
  const [records, setRecords] = useState(SEED_RECORDS);
  const [draft, setDraft] = useState({ date: today(), counts: {}, road: 0, time: "", endTime: "", weather: null, note: "" });
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState(ICONS[0]);
  const [toast, setToast] = useState("");
  const [backupText, setBackupText] = useState("");
  const [restoreOpen, setRestoreOpen] = useState(false);
  const [restoreText, setRestoreText] = useState("");
  const draftTimer = useRef(null);
  const firstRun = useRef(true);

  /* load */
  useEffect(() => {
    (async () => {
      try {
        const r = await window.storage.get(STORE_KEY);
        if (r?.value) {
          const p = JSON.parse(r.value);
          setWalks(p.walks || []);
          setSpecies(p.species?.length ? p.species : DEFAULT_SPECIES);
          const merged = { ...SEED_RECORDS, ...(p.records || {}) };
          /* a record saved before dates existed keeps its seed date if the value still matches */
          Object.keys(SEED_RECORDS).forEach((k) => {
            if (!merged[k]?.date && SEED_RECORDS[k].date && merged[k]?.value === SEED_RECORDS[k].value) {
              merged[k] = { ...merged[k], date: SEED_RECORDS[k].date };
            }
          });
          setRecords(merged);
        }
      } catch { /* nothing saved yet */ }
      try {
        const d = await window.storage.get(DRAFT_KEY);
        if (d?.value) {
          const p = JSON.parse(d.value);
          if (p.date === today()) setDraft(p);
        }
      } catch { /* no draft in progress */ }
      setReady(true);
    })();
  }, []);

  const persist = async (next) => {
    try {
      await window.storage.set(STORE_KEY, JSON.stringify({
        walks: next.walks ?? walks,
        species: next.species ?? species,
        records: next.records ?? records,
      }));
      setErr("");
    } catch {
      setErr("Couldn't save to this device. Your walk is still on screen — try again in a moment.");
    }
  };

  /* autosave the in-progress walk so closing the app mid-walk loses nothing */
  useEffect(() => {
    if (!ready) return;
    if (firstRun.current) { firstRun.current = false; return; }
    clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      window.storage.set(DRAFT_KEY, JSON.stringify(draft)).catch(() => {});
    }, 900);
    return () => clearTimeout(draftTimer.current);
  }, [draft, ready]);

  const bump = (id, delta) => {
    setDraft((d) => ({
      ...d,
      counts: { ...d.counts, [id]: Math.max(0, (d.counts[id] || 0) + delta) },
    }));
  };

  const bumpRoad = (delta) =>
    setDraft((d) => ({ ...d, road: Math.max(0, (d.road || 0) + delta) }));

  const setRoad = (raw) => {
    const v = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    setDraft((d) => ({ ...d, road: isNaN(v) ? 0 : Math.min(v, 999) }));
  };

  const saveWalk = async () => {
    const total = sum(draft.counts);
    const mins = minsBetween(draft.time, draft.endTime);
    const road = draft.road || 0;
    if (!total && !mins && !road) {
      setToast("Nothing to save yet — add a sighting or when you walked.");
      return;
    }
    const walk = {
      id: Date.now(),
      date: draft.date,
      counts: draft.counts,
      road,
      duration: mins || null,
      time: draft.time || null,
      endTime: draft.endTime || null,
      weather: draft.weather || null,
      note: draft.note.trim(),
    };

    /* did tonight beat anything? */
    const nextRecords = { ...records };
    const beaten = [];
    species.forEach((s) => {
      const n = draft.counts[s.id] || 0;
      if (n > (nextRecords[s.id]?.value || 0)) {
        nextRecords[s.id] = { value: n, date: draft.date };
        beaten.push(countOf(n, s.name));
      }
    });
    if (road > (nextRecords.road?.value || 0)) {
      nextRecords.road = { value: road, date: draft.date };
      beaten.push(`${road} on Bunny Road`);
    }
    if (mins && mins > (nextRecords.duration?.value || 0)) {
      nextRecords.duration = { value: mins, date: draft.date };
      beaten.push(`${fmtMins(mins)} walked`);
    }

    const next = [walk, ...walks].sort((a, b) => (a.date < b.date ? 1 : -1));
    setWalks(next);
    setRecords(nextRecords);
    await persist({ walks: next, records: nextRecords });
    setDraft({ date: today(), counts: {}, road: 0, time: "", endTime: "", weather: null, note: "" });
    try { await window.storage.delete(DRAFT_KEY); } catch {}
    setToast(beaten.length ? `New record — ${beaten.join(", ")}.` : "Walk saved.");
    setView(beaten.length ? "patterns" : "walks");
  };

  const setRecord = (key, raw) => {
    const v = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    const next = {
      ...records,
      [key]: { value: isNaN(v) ? 0 : Math.min(v, 9999), date: records[key]?.date ?? null },
    };
    setRecords(next);
    persist({ records: next });
  };

  const setRecordDate = (key, iso) => {
    const next = { ...records, [key]: { ...(records[key] || { value: 0 }), date: iso || null } };
    setRecords(next);
    persist({ records: next });
  };

  const copyBackup = async () => {
    const text = JSON.stringify({ v: 1, walks, species, records });
    setBackupText(text);
    try {
      await navigator.clipboard.writeText(text);
      setToast("Backup copied. Paste it into a note somewhere safe.");
    } catch {
      setToast("Couldn't copy on its own — select the text below and copy it.");
    }
  };

  const doRestore = async () => {
    let parsed;
    try { parsed = JSON.parse(restoreText); } catch { parsed = null; }
    if (!parsed || typeof parsed !== "object" || !Array.isArray(parsed.walks)) {
      setToast("That doesn't look like a backup. Check you pasted the whole thing.");
      return;
    }
    const w = parsed.walks;
    const sp = Array.isArray(parsed.species) && parsed.species.length ? parsed.species : DEFAULT_SPECIES;
    const rc = { ...SEED_RECORDS, ...(parsed.records || {}) };
    setWalks(w); setSpecies(sp); setRecords(rc);
    await persist({ walks: w, species: sp, records: rc });
    setRestoreOpen(false); setRestoreText("");
    setToast(`Restored ${w.length} ${w.length === 1 ? "walk" : "walks"} and your records.`);
  };

  const deleteWalk = async (id) => {
    const next = walks.filter((w) => w.id !== id);
    setWalks(next);
    await persist({ walks: next });
    setToast("Walk deleted.");
  };

  const addSpecies = async () => {
    const name = newName.trim();
    if (!name) return;
    const id = name.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
    const next = [...species, { id, name, icon: newIcon, custom: true }];
    setSpecies(next);
    await persist({ species: next });
    setNewName(""); setAdding(false);
  };

  const removeSpecies = async (id) => {
    const next = species.filter((s) => s.id !== id);
    setSpecies(next);
    await persist({ species: next });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  /* stats */
  const stats = useMemo(() => {
    const totalCritters = walks.reduce((a, w) => a + sum(w.counts), 0);
    const totalMins = walks.reduce((a, w) => a + (w.duration || 0), 0);
    const perSpecies = {};
    walks.forEach((w) => {
      Object.entries(w.counts || {}).forEach(([k, v]) => { perSpecies[k] = (perSpecies[k] || 0) + v; });
    });
    const best = walks.reduce((b, w) => (sum(w.counts) > sum(b?.counts || {}) ? w : b), null);
    const roadTotal = walks.reduce((a, w) => a + roadOf(w), 0);
    const roadNights = walks.filter((w) => roadOf(w) > 0).length;
    const bestRoad = walks.reduce((b, w) => (roadOf(w) > roadOf(b || { road: 0 }) ? w : b), null);
    const rab = perSpecies["rabbit"] || 0;

    const byHour = {};
    const byWeather = {};
    walks.forEach((w) => {
      const c = sum(w.counts);
      if (w.time) {
        const h = parseInt(w.time.slice(0, 2), 10);
        if (!byHour[h]) byHour[h] = { n: 0, c: 0 };
        byHour[h].n++; byHour[h].c += c;
      }
      if (w.weather) {
        if (!byWeather[w.weather]) byWeather[w.weather] = { n: 0, c: 0 };
        byWeather[w.weather].n++; byWeather[w.weather].c += c;
      }
    });
    const hourRows = Object.entries(byHour)
      .map(([h, v]) => ({ h: Number(h), avg: v.c / v.n, n: v.n }))
      .sort((a, b) => a.h - b.h);
    const weatherRows = Object.entries(byWeather)
      .map(([id, v]) => ({ ...WEATHER.find((x) => x.id === id), avg: v.c / v.n, n: v.n }))
      .sort((a, b) => b.avg - a.avg);

    return {
      totalCritters, totalMins, perSpecies, best, rab, roadTotal, roadNights, bestRoad,
      hourRows, weatherRows,
    };
  }, [walks]);

  const draftTotal = sum(draft.counts);
  const draftRoad = draft.road || 0;
  const onRoad = draftRoad > 0;

  /* plain functions, not components — keeps the inputs from losing focus mid-type */
  const bigRecord = (k, icon, label) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 17 }}>{icon}</span>
        <Eyebrow color={C.blossom}>{label}</Eyebrow>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginTop: 11 }}>
        <input
          value={records[k]?.value ?? 0} inputMode="numeric" aria-label={label}
          onChange={(e) => setRecord(k, e.target.value)} onFocus={(e) => e.target.select()}
          style={{
            width: 92, flexShrink: 0, padding: "8px 10px", borderRadius: 11, textAlign: "center",
            border: "1px solid rgba(244,167,185,.32)", background: "rgba(14,31,23,.55)",
            color: C.blossom, font: "700 32px 'Azeret Mono', monospace",
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <Tally n={records[k]?.value || 0} color={C.blossom} h={15} gap={5} max={10} />
        </div>
      </div>
      <div style={{ marginTop: 11, display: "flex", alignItems: "center", gap: 9 }}>
        <span style={{ fontSize: 12, color: C.sage, flexShrink: 0 }}>Set on</span>
        <input
          type="date" value={records[k]?.date || ""} max={today()}
          aria-label={`Date of ${label}`}
          onChange={(e) => setRecordDate(k, e.target.value)}
          style={{
            flex: 1, minWidth: 0, padding: "7px 10px", borderRadius: 9, fontSize: 13,
            border: "1px solid rgba(244,167,185,.22)", background: "rgba(14,31,23,.5)",
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

  const smallRecord = (k, icon, label, fmt) => (
    <div key={k} style={{ display: "flex", alignItems: "center", gap: 11 }}>
      <span style={{ fontSize: 17, width: 22, flexShrink: 0 }}>{icon}</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 14 }}>{label}</div>
        {fmt && (
          <div style={{ fontSize: 12, color: C.sage, marginTop: 1 }}>{fmt(records[k]?.value || 0)}</div>
        )}
      </div>
      <input
        value={records[k]?.value ?? 0} inputMode="numeric" aria-label={label}
        onChange={(e) => setRecord(k, e.target.value)} onFocus={(e) => e.target.select()}
        style={{
          width: 68, flexShrink: 0, padding: "8px 6px", borderRadius: 10, textAlign: "center",
          border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream,
          font: "700 17px 'Azeret Mono', monospace",
        }}
      />
    </div>
  );

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght,SOFT,WONK@9..144,400..700,0..100,0..1&family=Karla:wght@400;500;700&family=Azeret+Mono:wght@400;500;700&display=swap');
    * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
    .tk { animation: draw .34s ease-out backwards; }
    @keyframes draw { from { stroke-dashoffset: 1; } to { stroke-dashoffset: 0; } }
    .tk { stroke-dasharray: 1; }
    .tap:active { transform: scale(.93); }
    .tap { transition: transform .09s ease, background .15s ease, border-color .15s ease; }
    .rowtap { transition: transform .1s ease, border-color .25s ease, box-shadow .12s ease; }
    .rowtap:active { transform: scale(.985); box-shadow: inset 0 0 0 999px rgba(244,167,185,.08); }
    .row { transition: background .25s ease, border-color .25s ease; }
    button:focus-visible, input:focus-visible, [tabindex]:focus-visible {
      outline: 2px solid ${C.mint}; outline-offset: 3px;
    }
    input { font-family: 'Azeret Mono', monospace; }
    input[type=date], input[type=time] { color-scheme: dark; }
    input::placeholder { color: ${C.sage}; }
    .fade { animation: fade .3s ease-out; }
    @keyframes fade { from { opacity: 0; transform: translateY(6px);} to {opacity:1; transform:none;} }
    @media (prefers-reduced-motion: reduce) {
      .tk, .fade { animation: none; }
      .tap:active { transform: none; }
      .rowtap:active { transform: none; }
    }
  `;

  const shell = {
    minHeight: "100vh", background: C.moss, color: C.cream,
    fontFamily: "'Karla', system-ui, sans-serif",
    overflowX: "hidden", maxWidth: "100%",
    paddingBottom: "calc(96px + env(safe-area-inset-bottom))",
  };

  const card = {
    background: C.fern, borderRadius: 16, border: `1px solid ${C.sprig}`, padding: 16,
    maxWidth: "100%", minWidth: 0,
  };

  if (!ready) {
    return (
      <div style={{ ...shell, display: "grid", placeItems: "center" }}>
        <style>{css}</style>
        <div style={{ color: C.sage, font: "500 13px 'Azeret Mono', monospace", letterSpacing: ".1em" }}>
          LOADING YOUR LOG…
        </div>
      </div>
    );
  }

  return (
    <div style={shell}>
      <style>{css}</style>

      {/* header */}
      <header style={{
        padding: "26px 20px 20px",
        background: onRoad
          ? `linear-gradient(170deg, #33222B 0%, ${C.moss} 78%)`
          : `linear-gradient(170deg, #1E4232 0%, ${C.moss} 78%)`,
        transition: "background .5s ease",
        borderBottom: `1px solid ${C.sprig}`,
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
          <div style={{
            font: "700 23px 'Fraunces', Georgia, serif",
            fontVariationSettings: '"SOFT" 30, "WONK" 1',
            letterSpacing: "-.01em", flexShrink: 0,
          }}>
            Critter Counter
          </div>
          <div style={{ minWidth: 0, textAlign: "right" }}>
            <Eyebrow color={onRoad ? C.blossom : C.sage}>
              {view === "tonight" ? prettyDate(draft.date) : `${walks.length} walks`}
            </Eyebrow>
          </div>
        </div>

        {view === "tonight" && (
          <div style={{ marginTop: 18 }}>
            <Eyebrow>Seen tonight</Eyebrow>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 14, marginTop: 8, minHeight: 34 }}>
              <div style={{
                font: "700 40px 'Azeret Mono', monospace", lineHeight: .9,
                color: onRoad ? C.blossom : C.cream, transition: "color .4s ease",
              }}>
                {draftTotal}
              </div>
              <div style={{ paddingBottom: 2, flex: 1, minWidth: 0 }}>
                <Tally n={draftTotal} color={onRoad ? C.blossom : C.cream} h={20} max={18} />
              </div>
            </div>
          </div>
        )}
      </header>

      {err && (
        <div style={{ margin: "14px 20px 0", padding: "10px 14px", borderRadius: 12, background: "#3A2029", border: "1px solid #7A4553", fontSize: 13 }}>
          {err}
        </div>
      )}

      {/* ── TONIGHT ── */}
      {view === "tonight" && (
        <main style={{ padding: "18px 20px 0", display: "grid", gap: 14 }} className="fade">

          {/* species counters — the whole row adds one, so nothing sits off-screen */}
          <div style={{ display: "grid", gap: 9 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", padding: "0 2px" }}>
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
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); bump(s.id, 1); }
                  }}
                  className="rowtap"
                  style={{
                    ...card, padding: "11px 12px", cursor: "pointer", userSelect: "none",
                    WebkitUserSelect: "none",
                    borderColor: n ? "rgba(147,216,176,.35)" : C.sprig,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                    <span style={{ fontSize: 21, flexShrink: 0 }}>{s.icon}</span>

                    <span style={{
                      flex: 1, minWidth: 0,
                      font: "600 16px 'Fraunces', Georgia, serif",
                      fontVariationSettings: '"SOFT" 30, "WONK" 1',
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>{s.name}</span>

                    <button
                      onClick={(e) => { e.stopPropagation(); bump(s.id, -1); }}
                      aria-label={`One fewer ${s.name}`}
                      className="tap"
                      style={{
                        width: 34, height: 34, flexShrink: 0, borderRadius: 10, cursor: "pointer",
                        border: `1px solid ${C.sprig}`, background: "transparent", color: C.sage,
                        font: "500 18px 'Karla', sans-serif", display: "grid", placeItems: "center",
                      }}
                    >−</button>

                    <span style={{
                      font: "700 24px 'Azeret Mono', monospace", color: n ? C.cream : C.sage,
                      minWidth: 28, textAlign: "right", flexShrink: 0,
                    }}>{n}</span>

                    <span aria-hidden="true" style={{
                      width: 44, height: 44, flexShrink: 0, borderRadius: 999, pointerEvents: "none",
                      background: C.blossom, color: C.moss, font: "500 26px 'Karla', sans-serif",
                      display: "grid", placeItems: "center", lineHeight: 1,
                    }}>+</span>
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
            <button onClick={() => setAdding(true)} className="tap" style={{
              padding: "13px", borderRadius: 14, border: `1px dashed ${C.sprig}`, background: "transparent",
              color: C.sage, font: "500 14px 'Karla', sans-serif", cursor: "pointer",
            }}>
              + Add another critter
            </button>
          ) : (
            <div style={card}>
              <Eyebrow>New critter</Eyebrow>
              <input
                value={newName} onChange={(e) => setNewName(e.target.value)}
                placeholder="Skunk, deer, fox…" autoFocus
                style={{
                  width: "100%", marginTop: 10, padding: "12px 14px", borderRadius: 11,
                  border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream, fontSize: 16,
                }}
              />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 12 }}>
                {ICONS.map((ic) => (
                  <button key={ic} onClick={() => setNewIcon(ic)} className="tap" style={{
                    width: 42, height: 42, borderRadius: 11, fontSize: 19, cursor: "pointer",
                    background: newIcon === ic ? "rgba(244,167,185,.15)" : "transparent",
                    border: `1.5px solid ${newIcon === ic ? C.blossom : C.sprig}`,
                  }}>{ic}</button>
                ))}
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 14 }}>
                <button onClick={addSpecies} className="tap" style={{ ...primaryBtn, flex: 1 }}>Add critter</button>
                <button onClick={() => { setAdding(false); setNewName(""); }} className="tap" style={ghostBtn}>Cancel</button>
              </div>
              {species.some((s) => s.custom) && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${C.sprig}` }}>
                  <Eyebrow>Your critters</Eyebrow>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 9 }}>
                    {species.filter((s) => s.custom).map((s) => (
                      <button key={s.id} onClick={() => removeSpecies(s.id)} className="tap" style={{
                        padding: "7px 12px", borderRadius: 999, border: `1px solid ${C.sprig}`,
                        background: "transparent", color: C.sage, fontSize: 13, cursor: "pointer",
                      }}>{s.icon} {s.name} ×</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Bunny Road — kept as its own number */}
          <div style={{
            ...card,
            background: onRoad ? "rgba(244,167,185,.10)" : C.fern,
            borderColor: onRoad ? "rgba(244,167,185,.5)" : C.sprig,
            transition: "background .35s ease, border-color .35s ease",
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ fontSize: 19, filter: onRoad ? "none" : "grayscale(1) opacity(.6)" }}>🚏</span>
              <Eyebrow color={onRoad ? C.blossom : C.sage}>Bunny Road</Eyebrow>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
              <StepButton onClick={() => bumpRoad(-1)} label="One fewer bunny on Bunny Road">−</StepButton>
              <input
                value={draftRoad}
                inputMode="numeric"
                onChange={(e) => setRoad(e.target.value)}
                onFocus={(e) => e.target.select()}
                aria-label="Bunnies on Bunny Road"
                style={{
                  flex: 1, minWidth: 0, textAlign: "center", padding: "12px 4px", borderRadius: 12,
                  border: `1px solid ${onRoad ? "rgba(244,167,185,.4)" : C.sprig}`,
                  background: C.moss, color: onRoad ? C.blossom : C.sage,
                  font: "700 30px 'Azeret Mono', monospace",
                }}
              />
              <StepButton onClick={() => bumpRoad(1)} tone="go" label="One more bunny on Bunny Road">+</StepButton>
            </div>

            <div style={{ marginTop: 13, minHeight: 20 }}>
              <Tally n={draftRoad} color={C.blossom} h={18} gap={6} max={14} />
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: C.sage, lineHeight: 1.45, fontStyle: "italic" }}>
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

            {[
              ["Started", "time", "Start time"],
              ["Finished", "endTime", "End time"],
            ].map(([label, field, aria]) => (
              <div key={field} style={{ display: "flex", alignItems: "center", gap: 9, marginTop: 11 }}>
                <span style={{
                  width: 62, flexShrink: 0, font: "500 12px 'Azeret Mono', monospace",
                  letterSpacing: ".1em", textTransform: "uppercase", color: C.sage,
                }}>{label}</span>
                <input
                  type="time" value={draft[field]} aria-label={aria}
                  onChange={(e) => setDraft((d) => ({ ...d, [field]: e.target.value }))}
                  style={{
                    flex: 1, minWidth: 0, padding: "12px 14px", borderRadius: 11,
                    border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream, fontSize: 16,
                  }}
                />
                <button className="tap" onClick={() => {
                  const d = new Date();
                  const now = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
                  setDraft((p) => ({ ...p, [field]: now }));
                }} style={{
                  padding: "12px 14px", borderRadius: 11, flexShrink: 0, cursor: "pointer",
                  border: `1px solid ${C.sprig}`, background: "transparent", color: C.mint,
                  font: "600 13px 'Azeret Mono', monospace",
                }}>Now</button>
              </div>
            ))}

            {draft.time && draft.endTime && (
              <div style={{
                marginTop: 14, padding: "11px 14px", borderRadius: 11,
                background: "rgba(147,216,176,.1)", border: "1px solid rgba(147,216,176,.3)",
                display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10,
              }}>
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
                    <button key={w.id} className="tap"
                      onClick={() => setDraft((d) => ({ ...d, weather: on ? null : w.id }))}
                      style={{
                        padding: "9px 13px", borderRadius: 999, cursor: "pointer",
                        border: `1px solid ${on ? C.mint : C.sprig}`,
                        background: on ? "rgba(147,216,176,.14)" : "transparent",
                        color: on ? C.mint : C.sage,
                        font: "500 13px 'Karla', sans-serif",
                      }}>{w.icon} {w.label}</button>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: 20 }}>
              <Eyebrow>Walk date</Eyebrow>
              <input type="date" value={draft.date} max={today()}
                onChange={(e) => setDraft((d) => ({ ...d, date: e.target.value }))}
                style={{
                  width: "100%", marginTop: 9, padding: "12px 14px", borderRadius: 11,
                  border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream, fontSize: 15,
                }}
              />
            </div>

            <div style={{ marginTop: 16 }}>
              <Eyebrow>Note (optional)</Eyebrow>
              <input value={draft.note} onChange={(e) => setDraft((d) => ({ ...d, note: e.target.value }))}
                placeholder="Two kits under the hedge…"
                style={{
                  width: "100%", marginTop: 9, padding: "12px 14px", borderRadius: 11,
                  border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream,
                  fontSize: 15, fontFamily: "'Karla', sans-serif",
                }}
              />
            </div>
          </div>

          <button onClick={saveWalk} className="tap" style={{ ...primaryBtn, padding: "18px", fontSize: 17 }}>
            Save walk
          </button>
          <div style={{ textAlign: "center", fontSize: 12, color: C.sage, paddingBottom: 6 }}>
            Counts are kept as you tap, so you can close this mid-walk.
          </div>
        </main>
      )}

      {/* ── WALKS ── */}
      {view === "walks" && (
        <main style={{ padding: "18px 20px 0", display: "grid", gap: 12 }} className="fade">
          {walks.length === 0 && (
            <div style={{ ...card, padding: 26, textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>🌒</div>
              <div style={{ marginTop: 10, font: "600 17px 'Fraunces', Georgia, serif" }}>No walks logged yet</div>
              <div style={{ color: C.sage, fontSize: 14, marginTop: 6 }}>
                Start tallying on the Tonight tab and your first walk will land here.
              </div>
            </div>
          )}
          {walks.map((w) => {
            const t = sum(w.counts);
            const r = roadOf(w);
            return (
              <div key={w.id} style={card}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 10 }}>
                  <div style={{ font: "600 16px 'Fraunces', Georgia, serif", fontVariationSettings: '"SOFT" 30, "WONK" 1' }}>
                    {prettyDate(w.date)}
                  </div>
                  <div style={{ font: "700 18px 'Azeret Mono', monospace" }}>
                    {t}<span style={{ color: C.sage, fontSize: 12, fontWeight: 400 }}> seen</span>
                  </div>
                </div>

                <div style={{ marginTop: 9 }}><Tally n={t} color={C.mint} h={18} max={16} /></div>

                <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 13 }}>
                  {species.filter((s) => w.counts?.[s.id]).map((s) => (
                    <span key={s.id} style={chip}>{s.icon} {w.counts[s.id]}</span>
                  ))}
                  {w.time && (
                    <span style={{ ...chip, color: C.cream }}>
                      {fmtTime(w.time)}
                      {w.endTime ? ` → ${fmtTime(w.endTime)}` : w.duration ? ` → ${fmtTime(addMins(w.time, w.duration))}` : ""}
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
                  <span style={{ ...chip, color: C.sage, borderColor: "transparent", padding: "6px 4px" }}
                    title={moonOf(w.date).name}>
                    {moonOf(w.date).icon}
                  </span>
                  {r > 0 && (
                    <span style={{ ...chip, color: C.blossom, borderColor: "rgba(244,167,185,.4)" }}>
                      🚏 {r} on Bunny Road
                    </span>
                  )}
                </div>

                {w.note && (
                  <div style={{ marginTop: 12, fontSize: 14, color: C.cream, opacity: .75, fontStyle: "italic" }}>
                    {w.note}
                  </div>
                )}

                <button onClick={() => deleteWalk(w.id)} style={{
                  marginTop: 12, background: "none", border: "none", color: C.sage,
                  font: "500 12px 'Azeret Mono', monospace", letterSpacing: ".08em",
                  cursor: "pointer", padding: "4px 0", textTransform: "uppercase",
                }}>Delete walk</button>
              </div>
            );
          })}
        </main>
      )}

      {/* ── PATTERNS ── */}
      {view === "patterns" && (
        <main style={{ padding: "18px 20px 0", display: "grid", gap: 14 }} className="fade">

          {/* records — editable at any time, no walk required */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <div style={{
              font: "700 21px 'Fraunces', Georgia, serif", fontVariationSettings: '"SOFT" 30, "WONK" 1',
            }}>Records</div>
            <span style={{ fontSize: 12, color: C.sage }}>Tap a number to change it</span>
          </div>

          <div style={{
            ...card, display: "grid", gap: 18,
            background: "linear-gradient(160deg, rgba(244,167,185,.13), rgba(23,51,40,.6))",
            borderColor: "rgba(244,167,185,.35)",
          }}>
            {bigRecord("rabbit", "🐇", "Most bunnies in one night")}
            <div style={{ height: 1, background: "rgba(244,167,185,.2)" }} />
            {bigRecord("road", "🚏", "Most bunnies on Bunny Road")}
          </div>

          <div style={{ ...card, display: "grid", gap: 16 }}>
            <Eyebrow>Everything else</Eyebrow>
            {species.filter((s) => s.id !== "rabbit").map((s) => smallRecord(s.id, s.icon, `Most ${plural(s.name).toLowerCase()}`))}
            <div style={{ height: 1, background: C.sprig }} />
            {smallRecord("duration", "⏱", "Longest walk (minutes)", fmtMins)}
          </div>

          <div style={{ height: 6 }} />

          {walks.length === 0 ? (
            <div style={{ ...card, padding: 26, textAlign: "center" }}>
              <div style={{ fontSize: 30 }}>📓</div>
              <div style={{ marginTop: 10, font: "600 17px 'Fraunces', Georgia, serif" }}>No walks logged yet</div>
              <div style={{ color: C.sage, fontSize: 14, marginTop: 6 }}>
                Your records are saved above. Log a few evenings and the rest of the patterns fill in here.
              </div>
            </div>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  ["Walks", walks.length, C.cream, 24],
                  ["Critters", stats.totalCritters, C.mint, 24],
                  ["Time out", fmtMins(stats.totalMins), C.cream, 19],
                ].map(([label, val, col, fs]) => (
                  <div key={label} style={{ ...card, padding: 14, textAlign: "center" }}>
                    <div style={{ font: `700 ${fs}px 'Azeret Mono', monospace`, color: col }}>{val}</div>
                    <div style={{ marginTop: 4 }}><Eyebrow>{label}</Eyebrow></div>
                  </div>
                ))}
              </div>

              {/* the headline stat */}
              <div style={{
                ...card, background: "linear-gradient(160deg, rgba(244,167,185,.14), rgba(23,51,40,.6))",
                borderColor: "rgba(244,167,185,.35)",
              }}>
                <Eyebrow color={C.blossom}>The road's reputation, all-time</Eyebrow>
                <div style={{
                  marginTop: 12, font: "700 44px 'Azeret Mono', monospace", color: C.blossom, lineHeight: 1,
                }}>
                  {stats.roadTotal}
                </div>
                <div style={{ marginTop: 10, fontSize: 15, lineHeight: 1.5 }}>
                  bunnies on Bunny Road across {stats.roadNights} {stats.roadNights === 1 ? "evening" : "evenings"}
                  {stats.roadNights > 0 && (
                    <span style={{ color: C.sage }}>
                      {" "}— {(stats.roadTotal / stats.roadNights).toFixed(1)} a night on average.
                    </span>
                  )}
                </div>
                {stats.rab > 0 && (
                  <div style={{
                    marginTop: 14, paddingTop: 13, borderTop: "1px solid rgba(244,167,185,.22)",
                    fontSize: 14, color: C.sage,
                  }}>
                    Your overall rabbit tally is{" "}
                    <span style={{ color: C.cream, fontFamily: "'Azeret Mono', monospace", fontWeight: 700 }}>
                      {stats.rab}
                    </span>{" "}
                    — counted separately.
                  </div>
                )}
                {stats.bestRoad && roadOf(stats.bestRoad) > 0 && (
                  <div style={{ marginTop: 12, fontSize: 14 }}>
                    Best night on the road:{" "}
                    <span style={{ color: C.blossom, fontWeight: 700 }}>
                      {prettyDate(stats.bestRoad.date)}
                    </span>{" "}
                    with {roadOf(stats.bestRoad)}.
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
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                            <span>{s.icon} {plural(s.name)}</span>
                            <span style={{ font: "600 14px 'Azeret Mono', monospace", color: s.n ? C.cream : C.sage }}>{s.n}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 99, background: C.moss, overflow: "hidden" }}>
                            <div style={{
                              width: `${(s.n / top) * 100}%`, height: "100%", borderRadius: 99,
                              background: s.id === "rabbit" ? C.blossom : C.mint, transition: "width .5s ease",
                            }} />
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
                  {walks.slice(0, 14).reverse().map((w) => {
                    const t = sum(w.counts);
                    const top = Math.max(...walks.slice(0, 14).map((x) => sum(x.counts)), 1);
                    return (
                      <div key={w.id} title={`${prettyDate(w.date)} · ${t}`} style={{
                        flex: 1, height: `${Math.max((t / top) * 100, 4)}%`, borderRadius: "4px 4px 2px 2px",
                        background: roadOf(w) > 0 ? C.blossom : C.mint, opacity: .85,
                      }} />
                    );
                  })}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 10 }}>
                  <Eyebrow>Older</Eyebrow><Eyebrow>Latest</Eyebrow>
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
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, marginBottom: 6 }}>
                            <span>{hourLabel(r.h)}<span style={{ color: C.sage, fontSize: 12 }}> · {r.n} {r.n === 1 ? "walk" : "walks"}</span></span>
                            <span style={{ font: "600 14px 'Azeret Mono', monospace" }}>{r.avg.toFixed(1)}</span>
                          </div>
                          <div style={{ height: 7, borderRadius: 99, background: C.moss, overflow: "hidden" }}>
                            <div style={{
                              width: `${(r.avg / top) * 100}%`, height: "100%", borderRadius: 99,
                              background: C.blossom, transition: "width .5s ease",
                            }} />
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
                          {r.label}<span style={{ color: C.sage, fontSize: 12 }}> · {r.n}</span>
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
                  <div style={{
                    marginTop: 8, font: "600 19px 'Fraunces', Georgia, serif",
                    fontVariationSettings: '"SOFT" 30, "WONK" 1',
                  }}>
                    {prettyDate(stats.best.date)} — {sum(stats.best.counts)} critters
                  </div>
                  <div style={{ marginTop: 10 }}><Tally n={sum(stats.best.counts)} color={C.blossom} h={19} max={16} /></div>
                </div>
              )}

              {stats.totalMins > 0 && (
                <div style={{ ...card, textAlign: "center", color: C.sage, fontSize: 14 }}>
                  That's <span style={{ color: C.mint, fontWeight: 700, fontFamily: "'Azeret Mono', monospace" }}>
                    {(stats.totalCritters / (stats.totalMins / 60)).toFixed(1)}
                  </span> critters an hour of walking.
                </div>
              )}
            </>
          )}

          {/* backup — survives rebuilds of this artefact */}
          <div style={{ height: 6 }} />
          <div style={{ ...card, borderStyle: "dashed" }}>
            <Eyebrow>Backup</Eyebrow>
            <div style={{ fontSize: 13, color: C.sage, marginTop: 9, lineHeight: 1.5 }}>
              Copy this before asking for any changes to the app. If your log ever comes back empty, paste it into
              Restore to get everything back.
            </div>

            <div style={{ display: "flex", gap: 9, marginTop: 13 }}>
              <button onClick={copyBackup} className="tap" style={{ ...primaryBtn, flex: 1, padding: "13px" }}>
                Copy backup
              </button>
              <button onClick={() => setRestoreOpen((v) => !v)} className="tap" style={{ ...ghostBtn, padding: "13px 18px" }}>
                {restoreOpen ? "Cancel" : "Restore"}
              </button>
            </div>

            {backupText && !restoreOpen && (
              <textarea
                readOnly value={backupText} onFocus={(e) => e.target.select()} aria-label="Backup text"
                style={{
                  width: "100%", height: 80, marginTop: 11, padding: "10px 12px", borderRadius: 10, resize: "vertical",
                  border: `1px solid ${C.sprig}`, background: C.moss, color: C.sage,
                  font: "400 11px 'Azeret Mono', monospace",
                }}
              />
            )}

            {restoreOpen && (
              <div style={{ marginTop: 13 }}>
                <textarea
                  value={restoreText} onChange={(e) => setRestoreText(e.target.value)}
                  placeholder="Paste your backup here" aria-label="Paste backup to restore"
                  style={{
                    width: "100%", height: 90, padding: "10px 12px", borderRadius: 10, resize: "vertical",
                    border: `1px solid ${C.sprig}`, background: C.moss, color: C.cream,
                    font: "400 12px 'Azeret Mono', monospace",
                  }}
                />
                <div style={{ fontSize: 12, color: C.sage, margin: "9px 0 11px" }}>
                  This replaces everything currently in the app.
                </div>
                <button onClick={doRestore} className="tap" style={{ ...primaryBtn, width: "100%", padding: "13px" }}>
                  Restore from backup
                </button>
              </div>
            )}
          </div>
        </main>
      )}

      {/* toast */}
      {toast && (
        <div style={{
          position: "fixed", left: 20, right: 20, bottom: "calc(96px + env(safe-area-inset-bottom))",
          background: C.sprig, border: `1px solid ${C.sage}`, borderRadius: 12,
          padding: "13px 16px", fontSize: 14, textAlign: "center", zIndex: 20,
        }} className="fade">{toast}</div>
      )}

      {/* nav */}
      <nav style={{
        position: "fixed", left: 0, right: 0, bottom: 0, zIndex: 30,
        background: "rgba(14,31,23,.94)", backdropFilter: "blur(12px)",
        borderTop: `1px solid ${C.sprig}`,
        padding: "10px 12px calc(10px + env(safe-area-inset-bottom))",
        display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6,
      }}>
        {[["tonight", "Tonight", "🌙"], ["walks", "Walks", "📓"], ["patterns", "Patterns", "📈"]].map(([id, label, icon]) => (
          <button key={id} onClick={() => setView(id)} className="tap" style={{
            padding: "9px 4px", borderRadius: 12, border: "none", cursor: "pointer",
            background: view === id ? C.fern : "transparent",
            color: view === id ? C.cream : C.sage,
            display: "grid", gap: 3, justifyItems: "center",
          }}>
            <span style={{ fontSize: 17, filter: view === id ? "none" : "grayscale(1) opacity(.6)" }}>{icon}</span>
            <span style={{ font: "500 11px 'Azeret Mono', monospace", letterSpacing: ".08em", textTransform: "uppercase" }}>
              {label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}

const miniBtn = {
  width: 36, height: 36, borderRadius: 9, border: `1px solid ${C.sprig}`,
  background: "transparent", color: C.sage, font: "500 17px 'Karla', sans-serif",
  cursor: "pointer", display: "grid", placeItems: "center",
};

const primaryBtn = {
  padding: "15px", borderRadius: 13, border: "none", background: C.blossom, color: C.moss,
  font: "700 16px 'Karla', sans-serif", cursor: "pointer",
};

const ghostBtn = {
  padding: "15px 20px", borderRadius: 13, border: `1px solid ${C.sprig}`,
  background: "transparent", color: C.sage, font: "500 15px 'Karla', sans-serif", cursor: "pointer",
};

const chip = {
  padding: "6px 11px", borderRadius: 999, border: `1px solid ${C.sprig}`,
  font: "500 13px 'Azeret Mono', monospace", color: C.cream,
};
