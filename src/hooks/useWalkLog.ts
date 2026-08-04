/**
 * The single state container. Wires the tested storage layer to the UI:
 * boot (with self-heal + future-schema detection), persistence with the
 * refuse-to-shrink guard surfaced as an error banner, the debounced
 * draft autosave, and every user action.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import type { Draft, Records, Species, State, Walk } from "../types";
import {
  StorageError,
  clearDraft,
  emptyDraft,
  listPreRestores,
  listSnapshots,
  loadDraft,
  loadPreRestore,
  loadSnapshot,
  loadState,
  saveDraft,
  saveState,
  sortWalks,
  type KV,
  type PreRestoreInfo,
  type SnapshotInfo,
} from "../lib/storage";
import { applyWalkToRecords } from "../lib/records";
import { isDraftSaveable, walkFromDraft } from "../lib/walk";
import {
  lastExportedAt,
  markExported,
  parseBackup,
  serializeBackup,
  downloadBackup as downloadBackupFile,
  pickBackupFile,
} from "../lib/backup";
import { ICONS } from "../data/constants";

const kv: KV = window.localStorage;

export interface WalkLog {
  walks: Walk[];
  species: Species[];
  records: Records;
  draft: Draft;
  err: string;
  toast: string;
  futureSchema: number | null;
  snapshots: SnapshotInfo[];
  preRestores: PreRestoreInfo[];
  lastExport: string | null;
  setToast: (t: string) => void;
  bump: (id: string, delta: number) => void;
  bumpRoad: (delta: number) => void;
  setRoad: (raw: string) => void;
  setDraftField: <K extends keyof Draft>(field: K, value: Draft[K]) => void;
  /** Returns true when a record was beaten, null when nothing to save. */
  saveWalk: () => boolean | null;
  deleteWalk: (id: string) => void;
  /** Returns true when the species was actually added (name non-blank, persisted). */
  addSpecies: (name: string, icon: string) => boolean;
  removeSpecies: (id: string) => void;
  setRecord: (key: string, raw: string) => void;
  setRecordDate: (key: string, iso: string) => void;
  copyBackup: () => Promise<string>;
  downloadBackup: () => void;
  restoreFromText: (text: string) => boolean;
  importFromFile: () => Promise<void>;
  restoreSnapshot: (date: string) => void;
  undoRestore: (ts: string) => void;
}

export function useWalkLog(): WalkLog {
  const [boot] = useState(() => loadState(kv));
  const [walks, setWalks] = useState<Walk[]>(boot.state.walks);
  const [species, setSpecies] = useState<Species[]>(boot.state.species);
  const [records, setRecords] = useState<Records>(boot.state.records);
  const [draft, setDraft] = useState<Draft>(() => loadDraft(kv) ?? emptyDraft());
  const [err, setErr] = useState("");
  const [toast, setToast] = useState(
    boot.healedFrom ? `Recovered your log from the ${boot.healedFrom} snapshot.` : "",
  );
  const [storageTick, setStorageTick] = useState(0);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const firstRun = useRef(true);

  /* snapshot/pre-restore lists: full-state JSON parses, so recompute only
     when storage actually changes (every persist/markExported bumps the
     tick) — not on every tally-tap re-render */
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const snapshots = useMemo(() => listSnapshots(kv), [storageTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const preRestores = useMemo(() => listPreRestores(kv), [storageTick]);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const lastExport = useMemo(() => lastExportedAt(kv), [storageTick]);

  const persist = (
    next: Partial<State>,
    opts?: { allowEmpty?: boolean; reason?: "restore" },
  ): boolean => {
    const state: State = {
      walks: next.walks ?? walks,
      species: next.species ?? species,
      records: next.records ?? records,
    };
    try {
      saveState(kv, state, opts);
      setErr("");
      setStorageTick((t) => t + 1);
      return true;
    } catch (e) {
      setErr(
        e instanceof StorageError
          ? e.message
          : "Couldn't save to this device. Your walk is still on screen — try again in a moment.",
      );
      return false;
    }
  };

  /* autosave the in-progress walk so closing the app mid-walk loses nothing */
  useEffect(() => {
    if (firstRun.current) {
      firstRun.current = false;
      return;
    }
    if (draftTimer.current) clearTimeout(draftTimer.current);
    draftTimer.current = setTimeout(() => {
      saveDraft(kv, draft);
    }, 900);
    return () => {
      if (draftTimer.current) clearTimeout(draftTimer.current);
    };
  }, [draft]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2600);
    return () => clearTimeout(t);
  }, [toast]);

  const bump = (id: string, delta: number) =>
    setDraft((d) => ({
      ...d,
      counts: { ...d.counts, [id]: Math.max(0, (d.counts[id] || 0) + delta) },
    }));

  const bumpRoad = (delta: number) =>
    setDraft((d) => ({ ...d, road: Math.max(0, (d.road || 0) + delta) }));

  const setRoad = (raw: string) => {
    const v = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    setDraft((d) => ({ ...d, road: isNaN(v) ? 0 : Math.min(v, 999) }));
  };

  const setDraftField = <K extends keyof Draft>(field: K, value: Draft[K]) =>
    setDraft((d) => ({ ...d, [field]: value }));

  const saveWalk = (): boolean | null => {
    if (!isDraftSaveable(draft)) {
      setToast("Nothing to save yet — add a sighting or when you walked.");
      return null;
    }
    const walk = walkFromDraft(draft);
    const { records: nextRecords, beaten } = applyWalkToRecords({
      records,
      species,
      counts: walk.counts,
      road: walk.road,
      mins: walk.duration || 0,
      date: walk.date,
    });
    const next = sortWalks([walk, ...walks]);
    if (!persist({ walks: next, records: nextRecords })) return null;
    setWalks(next);
    setRecords(nextRecords);
    setDraft(emptyDraft());
    clearDraft(kv);
    setToast(beaten.length ? `New record — ${beaten.join(", ")}.` : "Walk saved.");
    return beaten.length > 0;
  };

  const deleteWalk = (id: string) => {
    const next = walks.filter((w) => w.id !== id);
    // deleting the final walk is explicit user intent, not a bug to block
    if (!persist({ walks: next }, { allowEmpty: next.length === 0 })) return;
    setWalks(next);
    setToast("Walk deleted.");
  };

  const addSpecies = (name: string, icon: string): boolean => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const id = trimmed.toLowerCase().replace(/\s+/g, "-") + "-" + Math.random().toString(36).slice(2, 6);
    const next = [...species, { id, name: trimmed, icon: icon || ICONS[0], custom: true }];
    if (!persist({ species: next })) return false;
    setSpecies(next);
    return true;
  };

  const removeSpecies = (id: string) => {
    const next = species.filter((s) => s.id !== id);
    if (!persist({ species: next })) return;
    setSpecies(next);
  };

  const setRecord = (key: string, raw: string) => {
    const v = parseInt(String(raw).replace(/[^\d]/g, ""), 10);
    const next: Records = {
      ...records,
      [key]: { value: isNaN(v) ? 0 : Math.min(v, 9999), date: records[key]?.date ?? null },
    };
    // persist-first like every other action: on StorageError the input
    // snaps back and the banner explains, instead of showing an accepted
    // edit that storage never took
    if (!persist({ records: next })) return;
    setRecords(next);
  };

  const setRecordDate = (key: string, iso: string) => {
    const next: Records = {
      ...records,
      [key]: { ...(records[key] || { value: 0 }), date: iso || null },
    };
    if (!persist({ records: next })) return;
    setRecords(next);
  };

  const currentState = (): State => ({ walks, species, records });

  const copyBackup = async (): Promise<string> => {
    const text = serializeBackup(currentState());
    try {
      await navigator.clipboard.writeText(text);
      markExported(kv);
      setStorageTick((t) => t + 1);
      setToast("Backup copied. Paste it into a note somewhere safe.");
    } catch {
      setToast("Couldn't copy on its own — select the text below and copy it.");
    }
    return text;
  };

  const downloadBackup = () => {
    downloadBackupFile(currentState());
    markExported(kv);
    setStorageTick((t) => t + 1);
    setToast("Backup file saved. Tuck it into Google Drive somewhere safe.");
  };

  const applyRestoredState = (state: State, what: string): boolean => {
    if (!persist(state, { allowEmpty: true, reason: "restore" })) return false;
    setWalks(state.walks);
    setSpecies(state.species);
    setRecords(state.records);
    setToast(
      `Restored ${state.walks.length} ${state.walks.length === 1 ? "walk" : "walks"} ${what} — undo is under Safety net.`,
    );
    return true;
  };

  const restoreFromText = (text: string): boolean => {
    const { state, error } = parseBackup(text);
    if (error === "future-schema") {
      setToast("That backup is from a NEWER version of this app — update the app first.");
      return false;
    }
    if (!state) {
      setToast("That doesn't look like a backup. Check you pasted the whole thing.");
      return false;
    }
    return applyRestoredState(state, "and your records");
  };

  const importFromFile = async (): Promise<void> => {
    const text = await pickBackupFile();
    if (text == null) return;
    restoreFromText(text);
  };

  const restoreSnapshot = (date: string) => {
    const state = loadSnapshot(kv, date);
    if (!state) {
      setToast("That snapshot couldn't be read.");
      return;
    }
    applyRestoredState(state, `from the ${date} snapshot`);
  };

  const undoRestore = (ts: string) => {
    const state = loadPreRestore(kv, ts);
    if (!state) {
      setToast("That restore point couldn't be read.");
      return;
    }
    applyRestoredState(state, "from before the restore");
  };

  return {
    walks,
    species,
    records,
    draft,
    err,
    toast,
    futureSchema: boot.futureSchema,
    snapshots,
    preRestores,
    lastExport,
    setToast,
    bump,
    bumpRoad,
    setRoad,
    setDraftField,
    saveWalk,
    deleteWalk,
    addSpecies,
    removeSpecies,
    setRecord,
    setRecordDate,
    copyBackup,
    downloadBackup,
    restoreFromText,
    importFromFile,
    restoreSnapshot,
    undoRestore,
  };
}
