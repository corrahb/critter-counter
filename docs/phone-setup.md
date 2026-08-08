# Phone setup — Samsung / Android

## Install (once)

1. Open **Chrome**, go to `corrahb.github.io/critter-counter/`
2. Menu ⋮ → **Install and create shortcut** (older Chrome: "Add to Home screen")
3. Open the icon from the home screen. Wait for the toast:
   *"Saved to your phone — the app now works with no signal at all."*
4. Optional proof: Airplane mode on → open the app → it loads instantly.

Never use Android's **App info → Clear data / Clear storage** on this app —
the entire walk log lives in that storage. ("Clear cache" is harmless.)

## Sunset times

On the Tonight tab, tap **"Show tonight's sunset time"** and allow location
once. The location is rounded to ~1 km, cached on the phone, and never sent
anywhere — sunset is computed on-device (NOAA solar math, no API).

## Open the app at sunset automatically (Samsung Modes and Routines)

True scheduled notifications need a server, which this app deliberately
doesn't have. Samsung's built-in automation does it better:

1. **Settings → Modes and Routines → Routines → +**
2. **If**: tap **Add what will trigger this routine** → **Time period** →
   choose **Sunset** (Samsung computes it from the phone's location; you can
   add an offset like "15 minutes before sunset")
3. **Then**: **Open app** → **Critter Counter**
4. Name it something like "Bunny o'clock" and save.

On Google Pixel phones the same is possible with the Routines feature in
the Clock app or via Google Assistant Routines ("At sunset → Open Critter
Counter").

## Backups

Patterns → **Download backup** puts a `critter-counter-DATE.json` file in
Downloads — move it to Google Drive. Restore from the same screen. The app
also keeps 5 days of automatic snapshots and an undo for any restore
(Patterns → Safety net).
