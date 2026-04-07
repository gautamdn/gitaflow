import { create } from 'zustand';

interface SarvamConsentModalState {
  visible: boolean;
  pendingResolve: ((granted: boolean) => void) | null;

  /** Open the modal and return a promise that resolves when the user chooses. */
  request: () => Promise<boolean>;
  /** Called by the modal when the user taps Allow or Not Now. */
  resolve: (granted: boolean) => void;
}

export const useSarvamConsentStore = create<SarvamConsentModalState>()((set, get) => ({
  visible: false,
  pendingResolve: null,

  request: () => {
    // If a request is already in flight, resolve the previous one as denied
    // so we never strand a caller. (Should not normally happen.)
    const prev = get().pendingResolve;
    if (prev) prev(false);

    return new Promise<boolean>((resolve) => {
      set({ visible: true, pendingResolve: resolve });
    });
  },

  resolve: (granted) => {
    const cb = get().pendingResolve;
    set({ visible: false, pendingResolve: null });
    if (cb) cb(granted);
  },
}));
