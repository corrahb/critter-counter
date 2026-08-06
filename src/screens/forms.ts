/** Ephemeral per-screen form state, lifted to App so tab switches keep it. */

export interface TonightForm {
  adding: boolean;
  newName: string;
  newIcon: string;
  /** "Enter times myself" open — for backdating without the timer. */
  manualTimes: boolean;
}

export interface PatternsForm {
  backupText: string;
  restoreOpen: boolean;
  restoreText: string;
  safetyOpen: boolean;
}
