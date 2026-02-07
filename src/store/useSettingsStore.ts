import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

export type FontSizeOption = 'small' | 'medium' | 'large';

interface SettingsState {
  darkMode: boolean;
  fontSize: FontSizeOption;
  showSanskrit: boolean;
  showTransliteration: boolean;
  showTranslation: boolean;

  toggleDarkMode: () => void;
  setFontSize: (size: FontSizeOption) => void;
  toggleShowSanskrit: () => void;
  toggleShowTransliteration: () => void;
  toggleShowTranslation: () => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      darkMode: false,
      fontSize: 'medium',
      showSanskrit: true,
      showTransliteration: true,
      showTranslation: true,

      toggleDarkMode: () => set((s) => ({ darkMode: !s.darkMode })),
      setFontSize: (size) => set({ fontSize: size }),
      toggleShowSanskrit: () => set((s) => ({ showSanskrit: !s.showSanskrit })),
      toggleShowTransliteration: () =>
        set((s) => ({ showTransliteration: !s.showTransliteration })),
      toggleShowTranslation: () =>
        set((s) => ({ showTranslation: !s.showTranslation })),
    }),
    {
      name: 'gitaflow-settings',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
