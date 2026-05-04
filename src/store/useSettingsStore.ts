import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeOption = 'small' | 'medium' | 'large';

interface SettingsState {
  darkMode: boolean;
  fontSize: FontSizeOption;
  showSanskrit: boolean;
  showSanskritKannada: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;
  sarvamConsentGranted: boolean;

  toggleDarkMode: () => void;
  setFontSize: (size: FontSizeOption) => void;
  toggleShowSanskrit: () => void;
  toggleShowSanskritKannada: () => void;
  toggleShowTransliteration: () => void;
  toggleShowTranslation: () => void;
  setSarvamConsent: (granted: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      fontSize: 'medium',
      showSanskrit: true,
      showSanskritKannada: false,
      showTransliteration: true,
      showTranslation: true,
      sarvamConsentGranted: false,

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleShowSanskrit: () => set((s) => ({ showSanskrit: !s.showSanskrit })),
      toggleShowSanskritKannada: () =>
        set((s) => ({ showSanskritKannada: !s.showSanskritKannada })),
      toggleShowTransliteration: () =>
        set((s) => ({ showTransliteration: !s.showTransliteration })),
      toggleShowTranslation: () =>
        set((s) => ({ showTranslation: !s.showTranslation })),
      setSarvamConsent: (granted) => set({ sarvamConsentGranted: granted }),
    }),
    {
      name: 'gitaflow-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
