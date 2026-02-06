import type { GitaData, Shloka, Chapter, DailyReading } from '../types/gita';

const rawData: GitaData = require('../../assets/data/gita-data.json');

const shlokaMap = new Map<string, Shloka>();
for (const shloka of rawData.shlokas) {
  shlokaMap.set(shloka.id, shloka);
}

const chapterMap = new Map<number, Chapter>();
for (const chapter of rawData.chapters) {
  chapterMap.set(chapter.chapter_number, chapter);
}

export function getShlokasByIds(ids: string[]): Shloka[] {
  return ids
    .map((id) => shlokaMap.get(id))
    .filter((s): s is Shloka => s !== undefined);
}

export function getDailyReading(day: number): DailyReading | undefined {
  return rawData.daily_readings.find((r) => r.day === day);
}

export function getChapter(chapterNumber: number): Chapter | undefined {
  return chapterMap.get(chapterNumber);
}

export function getTotalReadings(): number {
  return rawData.metadata.total_readings;
}
