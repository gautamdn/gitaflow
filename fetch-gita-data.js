#!/usr/bin/env node
/**
 * fetch-gita-data.js
 * 
 * Fetches all 700 shlokas from the Vedic Scriptures API (MIT licensed)
 * and structures them into a single JSON file for the GitaFlow app.
 * 
 * Usage: node fetch-gita-data.js
 * Output: gita-data.json
 * 
 * API Source: https://vedicscriptures.github.io/
 * License: MIT
 */

const fs = require('fs');
const path = require('path');

const BASE_URL = 'https://vedicscriptures.github.io';

// Verse counts per chapter (18 chapters, 700 total verses)
const CHAPTER_VERSES = {
  1: 47, 2: 72, 3: 43, 4: 42, 5: 29, 6: 47,
  7: 30, 8: 28, 9: 34, 10: 42, 11: 55, 12: 20,
  13: 35, 14: 27, 15: 20, 16: 24, 17: 28, 18: 78
};

// Helper: delay to be nice to the API
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Fetch with retry
async function fetchJSON(url, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return await response.json();
    } catch (err) {
      console.error(`  Retry ${i + 1}/${retries} for ${url}: ${err.message}`);
      if (i === retries - 1) throw err;
      await delay(1000 * (i + 1));
    }
  }
}

// Extract the translations we want for the app
function extractShloka(raw) {
  return {
    id: raw._id,                          // e.g., "BG2.47"
    chapter: raw.chapter,
    verse: raw.verse,
    sanskrit: raw.slok,                    // Devanagari text
    transliteration: raw.transliteration,  // IAST Roman script

    // English translations (pick 2-3 best for readability)
    translations: {
      sivananda: raw.siva?.et || null,
      purohit: raw.purohit?.et || null,
      gambirananda: raw.gambir?.et || null,
      adidevananda: raw.adi?.et || null,
    },

    // Hindi translations
    hindi: {
      tejomayananda: raw.tej?.ht || null,
      ramsukhdas: raw.rams?.ht || null,
    },

    // English commentary (Sivananda is comprehensive and readable)
    commentary_en: raw.siva?.ec || null,

    // Hindi commentary (Ramsukhdas is popular and detailed)
    commentary_hi: raw.rams?.hc || null,
  };
}

async function main() {
  console.log('🕉️  Fetching Bhagavad Gita data...\n');

  // Step 1: Fetch all chapters metadata
  console.log('📖 Fetching chapters...');
  const chaptersRaw = await fetchJSON(`${BASE_URL}/chapters`);

  const chapters = chaptersRaw.map(ch => ({
    chapter_number: ch.chapter_number,
    verses_count: ch.verses_count,
    name_sanskrit: ch.name,
    name_transliteration: ch.transliteration || null,
    name_english: ch.translation || null,
    meaning_en: ch.meaning?.en || null,
    meaning_hi: ch.meaning?.hi || null,
    summary_en: ch.summary?.en || null,
    summary_hi: ch.summary?.hi || null,
  }));

  console.log(`  ✅ ${chapters.length} chapters loaded\n`);

  // Step 2: Fetch all verses chapter by chapter
  const allShlokas = [];
  let totalFetched = 0;

  for (const [chapterStr, verseCount] of Object.entries(CHAPTER_VERSES)) {
    const chapter = parseInt(chapterStr);
    console.log(`📖 Chapter ${chapter} (${verseCount} verses)...`);

    for (let verse = 1; verse <= verseCount; verse++) {
      try {
        const raw = await fetchJSON(`${BASE_URL}/slok/${chapter}/${verse}`);
        const shloka = extractShloka(raw);
        allShlokas.push(shloka);
        totalFetched++;

        // Progress indicator
        if (verse % 10 === 0 || verse === verseCount) {
          process.stdout.write(`  ${verse}/${verseCount}\r`);
        }

        // Be nice to the API: small delay between requests
        await delay(100);
      } catch (err) {
        console.error(`  ❌ Failed: Chapter ${chapter}, Verse ${verse}: ${err.message}`);
      }
    }

    console.log(`  ✅ Chapter ${chapter} complete (${totalFetched} total)`);
  }

  // Step 3: Create daily readings (split 700 verses into ~239 days, ~3 verses/day)
  const VERSES_PER_DAY = 3;
  const readings = [];
  let dayNumber = 1;
  let shlokaIndex = 0;

  while (shlokaIndex < allShlokas.length) {
    const dayShlokas = [];
    const startShloka = allShlokas[shlokaIndex];
    const chapterNum = startShloka.chapter;

    // Try to keep readings within the same chapter
    for (let i = 0; i < VERSES_PER_DAY && shlokaIndex < allShlokas.length; i++) {
      const shloka = allShlokas[shlokaIndex];

      // If we've crossed into a new chapter and already have at least 1 verse, 
      // start a new day for the new chapter
      if (shloka.chapter !== chapterNum && dayShlokas.length > 0) {
        break;
      }

      dayShlokas.push(shloka.id);
      shlokaIndex++;
    }

    readings.push({
      day: dayNumber,
      chapter: chapterNum,
      shloka_ids: dayShlokas,
      shloka_range: `${dayShlokas[0]} - ${dayShlokas[dayShlokas.length - 1]}`,
    });

    dayNumber++;
  }

  // Step 4: Assemble final data
  const gitaData = {
    metadata: {
      title: 'Srimad Bhagavad Gita',
      total_chapters: 18,
      total_shlokas: allShlokas.length,
      total_readings: readings.length,
      verses_per_day: VERSES_PER_DAY,
      source: 'https://vedicscriptures.github.io/',
      license: 'MIT',
      fetched_at: new Date().toISOString(),
    },
    chapters,
    shlokas: allShlokas,
    daily_readings: readings,
  };

  // Step 5: Write to file
  const outputPath = path.join(__dirname, 'gita-data.json');
  fs.writeFileSync(outputPath, JSON.stringify(gitaData, null, 2), 'utf-8');

  const fileSizeMB = (fs.statSync(outputPath).size / 1024 / 1024).toFixed(2);

  console.log('\n✨ Done!\n');
  console.log(`📁 Output: ${outputPath}`);
  console.log(`📊 Stats:`);
  console.log(`   Chapters: ${chapters.length}`);
  console.log(`   Shlokas:  ${allShlokas.length}`);
  console.log(`   Readings: ${readings.length} days`);
  console.log(`   File size: ${fileSizeMB} MB`);
  console.log('\n🚀 Copy gita-data.json into your app\'s assets folder.');
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
