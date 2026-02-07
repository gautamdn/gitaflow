import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { UserProgress } from '../types/gita';

function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

function isConsecutiveDay(dateA: string, dateB: string): boolean {
  const a = new Date(dateA + 'T00:00:00');
  const b = new Date(dateB + 'T00:00:00');
  const diffMs = Math.abs(b.getTime() - a.getTime());
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

interface ProgressStore extends UserProgress {
  markDayComplete: (day: number) => void;
  resetProgress: () => void;
}

const INITIAL_STATE: UserProgress = {
  current_day: 1,
  completed_readings: [],
  streak_count: 0,
  last_read_date: null,
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      ...INITIAL_STATE,

      resetProgress: () => set(INITIAL_STATE),

      markDayComplete: (day: number) => {
        const state = get();
        if (state.completed_readings.includes(day)) return;

        const today = getTodayString();
        let newStreak = state.streak_count;

        if (state.last_read_date === null) {
          newStreak = 1;
        } else if (state.last_read_date === today) {
          // Already read today — streak stays
        } else if (isConsecutiveDay(state.last_read_date, today)) {
          newStreak = state.streak_count + 1;
        } else {
          newStreak = 1;
        }

        const newCurrentDay =
          day === state.current_day
            ? Math.min(state.current_day + 1, 239)
            : state.current_day;

        set({
          current_day: newCurrentDay,
          completed_readings: [...state.completed_readings, day],
          streak_count: newStreak,
          last_read_date: today,
        });
      },
    }),
    {
      name: 'gitaflow-progress',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
