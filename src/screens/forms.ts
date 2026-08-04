/** Ephemeral per-screen form state, lifted to App so tab switches keep it. */

export interface TonightForm {
  adding: boolean;
  newName: string;
  newIcon: string;
}

export interface PatternsForm {
  backupText: string;
  restoreOpen: boolean;
  restoreText: string;
  safetyOpen: boolean;
}
