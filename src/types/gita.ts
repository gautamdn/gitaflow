export interface GitaMetadata {
  title: string;
  total_chapters: number;
  total_shlokas: number;
  total_readings: number;
  verses_per_day: number;
  source: string;
  license: string;
  fetched_at: string;
}

export interface Chapter {
  chapter_number: number;
  verses_count: number;
  name_sanskrit: string;
  name_transliteration: string | null;
  name_english: string | null;
  meaning_en: string | null;
  meaning_hi: string | null;
  summary_en: string | null;
  summary_hi: string | null;
}

export interface Shloka {
  id: string;
  chapter: number;
  verse: number;
  sanskrit: string;
  transliteration: string;
  translations: {
    sivananda: string | null;
    purohit: string | null;
    gambirananda: string | null;
    adidevananda: string | null;
  };
  hindi: {
    tejomayananda: string | null;
    ramsukhdas: string | null;
  };
  commentary_en: string | null;
  commentary_hi: string | null;
}

export interface DailyReading {
  day: number;
  chapter: number;
  shloka_ids: string[];
  shloka_range: string;
}

export interface GitaData {
  metadata: GitaMetadata;
  chapters: Chapter[];
  shlokas: Shloka[];
  daily_readings: DailyReading[];
}

export interface UserProgress {
  current_day: number;
  completed_readings: number[];
  streak_count: number;
  last_read_date: string | null;
}
