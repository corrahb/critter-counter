# Critter Counter — Spec

A personal wildlife tally for an evening neighbourhood walk. One user. Used one-handed, outdoors, in fading light, on a phone.

---

## 1. What it records

Per walk:

| Field | Type | Notes |
|---|---|---|
| `date` | ISO `YYYY-MM-DD` | Defaults to today; backdating allowed |
| `counts` | `{ speciesId: number }` | Per-critter tally |
| `road` | number | Bunnies seen on Bunny Road — **fully independent** of `counts.rabbit` |
| `time` | `HH:MM` | Start time |
| `endTime` | `HH:MM` | End time |
| `duration` | number (minutes) | **Derived** from `time`→`endTime`, stored for stats |
| `weather` | string \| null | One of: clear, cloudy, rain, snow, windy |
| `note` | string | Optional free text |
| `id` | number | `Date.now()` |

Moon phase is **not stored** — it's computed from `date` on the fly.

Dogs are deliberately not tracked (they're always being walked by someone).

### Species

`{ id, name, icon, custom? }`. Defaults: Rabbit 🐇, Raccoon 🦝, Wild turkey 🦃, Cat 🐈. User can add custom critters from an emoji picker (deer, fox, skunk, squirrel, beaver, bird, owl, duck, frog, turtle, bat, wolf, badger, bear) and delete only the custom ones.

### Records (personal bests)

`{ [key]: { value: number, date: ISO | null } }` where key is a species id, or `road`, or `duration`.

Records are **standalone** — editable at any time without logging a walk, because the user knows old high scores but not the walks around them. They also update automatically when a saved walk beats one, stamping that walk's date.

Seeded starting values:

```
rabbit   25   2026-07-24
road     11   2026-08-02
turkey    2   (no date)
raccoon   2   (no date)
duration 90   (no date)   // minutes
```

---

## 2. Screens

Bottom tab bar, three tabs.

### Tonight
1. Header: app name, date, running total as a numeral **and** as tally marks.
2. Species rows — **tap anywhere on the row to add one**. Small `−` inline to undo. Tally marks under the name. This exists because reaching a small `+` on the right edge caused sideways scrolling and lost track of which animal was being counted.
3. `+ Add another critter`.
4. **Bunny Road** card: its own `−` / number field / `+`. Type directly or tap. Uncapped, never touched by the rabbit tally. Caption in italics: *"Does Bunny Road actually earn its title tonight?"*
5. When you walked: Started / Finished time fields, each with a `Now` button. Derived length shown back as `7:15 pm → 8:45 pm · 1h 30m`. Moon phase for the date shown top-right.
6. Conditions: five weather chips, single-select, tap again to clear.
7. Walk date, optional note.
8. Save walk.

### Walks
Reverse-chronological list. Each: date, total, tally marks, chips for per-species counts, time range, duration, weather, moon, Bunny Road count. Note in italics. Delete.

### Patterns
1. **Records** at the top, always visible even with zero walks. Rabbit and Bunny Road get large blossom-pink treatment with editable number *and* editable date (moon phase shown beside it). Everything else in a compact list.
2. Summary trio: walks, critters, time out.
3. *The road's reputation, all-time* — total bunnies on Bunny Road, nights recorded, nightly average, best night, with the overall rabbit tally shown separately beneath.
4. All-time ranking by critter (bars, pluralized names, rabbit bar in blossom).
5. Average sightings by start hour (bars).
6. Average sightings by conditions.
7. Last 14 walks (bar chart; bars where Bunny Road had a count are blossom).
8. Busiest evening.
9. Critters per hour of walking.
10. **Backup** — copy everything to clipboard as JSON, restore by pasting back.

---

## 3. Rules and edge cases

- **Bunny Road is never derived.** No cap against the rabbit count, no coupling. An earlier version credited it via an "I'm on Bunny Road" toggle — that was wrong, because most nights the number gets entered after the fact.
- **Times wrap midnight.** `23:40 → 00:25` is 45 minutes, not negative.
- **Draft autosaves** (debounced ~900ms) so the phone can be locked mid-walk without losing counts. Cleared on save. Only restored if the draft's date is today.
- **A walk can save on any one of** counts, Bunny Road, or a time range.
- **Pluralization** is real, not `+ "s"`: raccoons, wild turkeys, foxes, bunnies, wolves, geese, mice, and deer staying deer. Applied to the last word only. Used in records labels, the all-time ranking, and the "New record" message (which must also handle `1 rabbit` vs `2 rabbits`).
- **Records beaten on save** produce a toast listing what was beaten and jump to Patterns.
- Species names truncate with ellipsis rather than widening a row.

### Moon phase

Synodic approximation from the date alone:

```js
const SYNODIC = 29.530588853;
const days = Date.UTC(y, m - 1, d, 21) / 86400000;
const ref   = Date.UTC(2000, 0, 6, 18, 14) / 86400000;  // known new moon
const age   = (((days - ref) % SYNODIC) + SYNODIC) % SYNODIC;
const phase = Math.floor((age / SYNODIC) * 8 + 0.5) % 8;
// 🌑 New, 🌒 Waxing crescent, 🌓 First quarter, 🌔 Waxing gibbous,
// 🌕 Full, 🌖 Waning gibbous, 🌗 Last quarter, 🌘 Waning crescent
```

Verified against four known eclipse dates: 2000-01-06 (new), 2000-01-21 (full), 2024-04-08 (new), 2025-03-14 (full).

Moon is decoration, not analysis — there aren't enough walks for a lunar correlation to mean anything.

---

## 4. Design

**Direction:** mossy evening. Deep green ground, blossom pink accent, mint for data. Cute and soft rather than clinical, but dark enough to use outside at night without blinding anyone.

### Palette

| Token | Hex | Use |
|---|---|---|
| `moss` | `#0E1F17` | Background |
| `fern` | `#173328` | Card surfaces |
| `sprig` | `#234836` | Borders, rules |
| `cream` | `#F0EBDA` | Primary text |
| `blossom` | `#F4A7B9` | Primary accent — buttons, Bunny Road, records |
| `mint` | `#93D8B0` | Secondary — tally marks, times, stats |
| `sage` | `#7FA08D` | Muted labels |

Contrast on moss: cream 14.3:1, blossom 9.0:1, mint 10.3:1, sage 6.0:1. Dark text on a blossom button is 9.0:1.

Header uses a gradient from `#1E4232`, shifting to `#33222B` once Bunny Road has a count.

### Type

- **Display** — Fraunces, `font-variation-settings: "SOFT" 30, "WONK" 1`. Engraved field-guide feel.
- **UI** — Karla.
- **All numbers, times, labels** — Azeret Mono.

### Signature element: tally marks

Counts render as hand-drawn five-bar-gate tallies in SVG — four verticals plus a diagonal per group of five. Strokes carry deterministic jitter (seeded by index, so they don't twitch on re-render) and draw themselves in via `stroke-dasharray` when added. Because React keeps existing nodes, only genuinely new strokes animate. Groups wrap; beyond a max, overflow shows as `+N`.

This is the whole visual identity. Keep it.

### Mobile constraints

- Must fit **320px** wide with no horizontal scroll, ever. `overflow-x: hidden` on the shell, `min-width: 0` on every flex child.
- Bottom nav and page bottom respect `env(safe-area-inset-bottom)`.
- Tap targets ≥ 34px; the species row is the full card width.
- Row press gives a subtle scale + inset flash — feedback without checking the number.
- `prefers-reduced-motion` disables all animation.
- Native date/time inputs need `color-scheme: dark`.

---

## 5. What was deliberately left out

Steps (the user tracks steps across a whole day, not per walk), distance in km, temperature, route or direction, walking companions, photos, and lunar correlation charts. This is a fun personal thing, not a research project. Adding any of these should clear a high bar.

---

## 6. Worth adding in a real app

Things the web artefact couldn't do:

- **Install to home screen**, launch full-screen, work fully offline.
- **A dusk reminder** — local notification around sunset. Sunset time can be computed from latitude and date offline, no API.
- **Export to a real file** and import back, instead of clipboard JSON.
- **Haptic tap** on each count.
- Optional: keep the screen awake while counting; a widget showing tonight's total.
