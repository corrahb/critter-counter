# Prompt for Claude Code

Drop `CRITTER-COUNTER-SPEC.md` and `critter-counter-reference.jsx` into an empty folder, open Claude Code there, and paste the prompt below.

---

## The prompt

```
I want to turn a working prototype into a real app I can install on my
phone and use every evening. Two files in this folder:

- CRITTER-COUNTER-SPEC.md — the full spec. Read this first.
- critter-counter-reference.jsx — the working prototype. Every feature,
  colour, and piece of copy in the spec exists here already. Treat it as
  the source of truth for behaviour and visual design.

Build it as an installable PWA: Vite + React + TypeScript, with a service
worker so it works fully offline and a manifest so it installs to my iPhone
home screen and launches full-screen with no browser chrome. I'm the only
user — no accounts, no server, no analytics. Everything stays on the device.

Start by reading both files and telling me your plan before writing code.
I'd like to review the structure first.

Requirements beyond a straight port:

1. STORAGE. The prototype used a sandboxed key-value store I couldn't
   control, and it wiped my data every time the prototype was rebuilt.
   That must never happen again. Use localStorage under a stable versioned
   key, write a migration path for future schema changes, and add real
   file export/import (download a .json, pick a file to restore) alongside
   the existing clipboard backup.

2. KEEP THE TALLY MARKS. The hand-drawn five-bar-gate SVG counters are the
   whole personality of the app. Port them exactly, jitter and draw-in
   animation included.

3. MOBILE FIRST, 320px FLOOR. Nothing may ever scroll sideways. The
   tap-anywhere-on-the-row counting is the most important interaction —
   I use it one-handed in the dark while walking.

4. NEW, once the port works and I've confirmed it:
   - A local notification reminding me to walk around sunset. Compute
     sunset from my latitude and the date locally; don't call an API.
   - Haptic feedback on each count where the browser supports it.

5. TESTS for the fiddly logic: the midnight-wrapping time maths, the
   pluralizer, the moon phase (there are four verified eclipse dates in
   the spec), and the record-beating rules.

My existing records are seeded in the spec — carry them over exactly.

Work in small steps and let me try each one on my phone over local network
before moving on.
```

---

## Notes

**Why a PWA and not a native app.** You're one user who wants this on your own phone. A PWA installs to the home screen, runs offline, launches full-screen, and costs nothing. A native iOS build needs Xcode and a $99/year developer account, or the app expires off your phone every 7 days.

If you later want the App Store, real push notifications, or a home screen widget, the swap is **Expo + React Native**. The spec ports almost unchanged; the tally marks move to `react-native-svg` and storage moves to `AsyncStorage`. You could tell Claude Code to use Expo instead in the prompt above and everything else holds.

**On iPhone, install via Safari** — Share → Add to Home Screen. Chrome on iOS can't install PWAs.

**Before you start:** open the artefact, go to Patterns → Copy backup, and paste it into a note. That JSON drops straight into the new app's import.
