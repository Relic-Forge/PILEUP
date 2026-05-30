export interface SaveState {
  version: 1;
  lastSeed?: string;
}

export const emptySaveState = (): SaveState => ({
  version: 1,
});
