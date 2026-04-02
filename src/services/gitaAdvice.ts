import { getShlokasByIds } from './gitaData';
import type { Shloka } from '../types/gita';

/**
 * "Ask Gita" — maps life situations to relevant Bhagavad Gita shlokas.
 *
 * Each topic has keywords (matched against user input) and curated shloka IDs
 * with a brief explanation of why the Gita's teaching is relevant.
 */

export interface GitaAdviceResult {
  topic: string;
  explanation: string;
  shlokas: Shloka[];
}

interface TopicMapping {
  id: string;
  label: string;
  /** Suggested prompt shown to user */
  prompt: string;
  /** Keywords for matching free-text queries (lowercase) */
  keywords: string[];
  /** Curated shloka IDs most relevant to this topic */
  shlokaIds: string[];
  /** Brief explanation of the Gita's guidance on this topic */
  explanation: string;
}

const TOPIC_MAPPINGS: TopicMapping[] = [
  {
    id: 'anxiety',
    label: 'Feeling Anxious',
    prompt: 'I am feeling anxious and worried about the future',
    keywords: [
      'anxious', 'anxiety', 'worried', 'worry', 'fear', 'afraid', 'nervous',
      'stress', 'stressed', 'tension', 'panic', 'restless', 'uneasy', 'uncertain',
      'future', 'overthinking',
    ],
    shlokaIds: ['BG2.14', 'BG18.66'],
    explanation:
      'Pleasure and pain are fleeting like seasons — endure them patiently. ' +
      'Surrendering to the divine frees one from all fear.',
  },
  {
    id: 'duty',
    label: 'Confused About My Duty',
    prompt: 'I am confused about what is the right thing to do',
    keywords: [
      'duty', 'dharma', 'confused', 'confusion', 'right', 'wrong', 'decision',
      'dilemma', 'choice', 'choose', 'purpose', 'responsibility', 'obligation',
      'what should i do', 'path', 'direction',
    ],
    shlokaIds: ['BG2.47', 'BG3.35'],
    explanation:
      'You have the right to action alone, never to its fruits. ' +
      'Perform your own dharma, even imperfectly, rather than follow another\'s path perfectly.',
  },
  {
    id: 'grief',
    label: 'Dealing With Loss',
    prompt: 'I am grieving and struggling with loss',
    keywords: [
      'grief', 'loss', 'death', 'die', 'died', 'dead', 'mourning', 'sad',
      'sadness', 'sorrow', 'crying', 'miss', 'missing', 'gone', 'departed',
      'bereavement', 'passing',
    ],
    shlokaIds: ['BG2.22', 'BG2.20'],
    explanation:
      'The soul is eternal — just as one discards old clothes for new, the soul moves to a new body. ' +
      'It is never born and never dies.',
  },
  {
    id: 'anger',
    label: 'Struggling With Anger',
    prompt: 'I am struggling to control my anger',
    keywords: [
      'anger', 'angry', 'rage', 'furious', 'frustrated', 'frustration', 'mad',
      'irritated', 'resentment', 'hatred', 'hate', 'temper', 'hostile',
    ],
    shlokaIds: ['BG2.62', 'BG16.21'],
    explanation:
      'From dwelling on sense objects comes attachment, then desire, then anger, then ruin. ' +
      'Desire, anger, and greed are the three gates to self-destruction.',
  },
  {
    id: 'motivation',
    label: 'Lacking Motivation',
    prompt: 'I feel lazy and have no motivation to act',
    keywords: [
      'lazy', 'unmotivated', 'motivation', 'procrastinate', 'procrastination',
      'lethargic', 'sluggish', 'inaction', 'stuck', 'stagnant', 'passive',
      'giving up', 'give up', 'quit', 'quitting', 'hopeless',
    ],
    shlokaIds: ['BG3.8', 'BG6.5'],
    explanation:
      'Action is superior to inaction — even the body cannot be maintained without work. ' +
      'Elevate yourself by your own mind; the self is its own friend and its own enemy.',
  },
  {
    id: 'detachment',
    label: 'Too Attached to Results',
    prompt: 'I am too attached to outcomes and cannot let go',
    keywords: [
      'attached', 'attachment', 'outcome', 'result', 'results', 'expectation',
      'expectations', 'let go', 'letting go', 'control', 'obsessed', 'clinging',
      'possessive', 'desire', 'wanting', 'craving',
    ],
    shlokaIds: ['BG2.47', 'BG5.10'],
    explanation:
      'Perform action without attachment to results. ' +
      'One who offers all to the divine is untouched by sin, as a lotus leaf by water.',
  },
  {
    id: 'peace',
    label: 'Seeking Inner Peace',
    prompt: 'I want to find inner peace and calm my mind',
    keywords: [
      'peace', 'peaceful', 'calm', 'tranquil', 'serene', 'stillness', 'quiet',
      'meditation', 'meditate', 'mindful', 'mindfulness', 'inner peace',
      'contentment', 'equanimity', 'balance', 'harmony',
    ],
    shlokaIds: ['BG2.70', 'BG5.29'],
    explanation:
      'Peace comes to those who remain unmoved, like the ocean receiving rivers undisturbed. ' +
      'Knowing the Lord as the friend of all beings brings peace.',
  },
  {
    id: 'self-doubt',
    label: 'Doubting Myself',
    prompt: 'I doubt my abilities and feel I am not good enough',
    keywords: [
      'doubt', 'self-doubt', 'insecure', 'insecurity', 'confidence', 'not good enough',
      'imposter', 'inadequate', 'unworthy', 'weak', 'weakness', 'failure',
      'failed', 'incapable', 'inferior',
    ],
    shlokaIds: ['BG6.5', 'BG4.42'],
    explanation:
      'Elevate yourself by your own self — the self alone is its own friend and enemy. ' +
      'Cut asunder the doubt in your heart with the sword of knowledge. Arise!',
  },
  {
    id: 'relationships',
    label: 'Relationship Struggles',
    prompt: 'I am having difficulties in my relationships',
    keywords: [
      'relationship', 'relationships', 'family', 'friend', 'friends', 'marriage',
      'love', 'partner', 'conflict', 'argument', 'fight', 'betrayal', 'trust',
      'forgive', 'forgiveness', 'jealous', 'jealousy', 'loneliness', 'lonely',
    ],
    shlokaIds: ['BG12.13', 'BG12.15'],
    explanation:
      'The ideal devotee bears no ill will, is friendly and compassionate, free from ego. ' +
      'One who disturbs no one and is not disturbed by others is dear to the Lord.',
  },
  {
    id: 'focus',
    label: 'Cannot Focus My Mind',
    prompt: 'My mind is distracted and I cannot concentrate',
    keywords: [
      'focus', 'concentrate', 'concentration', 'distracted', 'distraction',
      'scattered', 'wandering', 'mind', 'attention', 'discipline', 'restless',
      'monkey mind',
    ],
    shlokaIds: ['BG6.35', 'BG6.26'],
    explanation:
      'The mind is restless like the wind, but it can be controlled through practice and detachment. ' +
      'Whenever it wanders, bring it back under the control of the self.',
  },
  {
    id: 'success',
    label: 'Wanting Success',
    prompt: 'I want to succeed but face many obstacles',
    keywords: [
      'success', 'succeed', 'achieve', 'achievement', 'goal', 'goals', 'ambition',
      'career', 'work', 'job', 'obstacle', 'obstacles', 'challenge', 'challenges',
      'competition', 'winning', 'excellence', 'perform', 'performance',
    ],
    shlokaIds: ['BG2.48', 'BG18.48'],
    explanation:
      'Perform your work with equanimity — evenness of mind is yoga. ' +
      'Every endeavor has some defect, as fire has smoke — do not abandon work born of your nature.',
  },
  {
    id: 'faith',
    label: 'Questioning My Faith',
    prompt: 'I am questioning my faith and spiritual path',
    keywords: [
      'faith', 'belief', 'believe', 'god', 'divine', 'spiritual', 'spirituality',
      'religion', 'prayer', 'devotion', 'worship', 'meaning', 'meaningless',
      'existential', 'void', 'soul', 'atman', 'krishna',
    ],
    shlokaIds: ['BG9.22', 'BG18.66'],
    explanation:
      'To those who worship with undivided devotion, Krishna personally carries what they need. ' +
      'Surrender unto Me — I shall deliver you from all fear.',
  },
];

/**
 * Get all suggested prompts for the "Ask Gita" screen.
 */
export function getSuggestedTopics(): { id: string; label: string; prompt: string }[] {
  return TOPIC_MAPPINGS.map(({ id, label, prompt }) => ({ id, label, prompt }));
}

/**
 * Find the best matching topic for a user's query using keyword scoring.
 * Returns the top matches (up to `limit`).
 */
export function findAdvice(query: string, limit = 2): GitaAdviceResult[] {
  const words = query.toLowerCase().split(/\s+/).filter((w) => w.length >= 3);

  if (words.length === 0) return [];

  // Score each topic by keyword overlap
  const scored = TOPIC_MAPPINGS.map((topic) => {
    let score = 0;
    for (const word of words) {
      for (const keyword of topic.keywords) {
        if (keyword === word) {
          score += 3; // exact match
        } else if (keyword.includes(word) || word.includes(keyword)) {
          score += 1; // partial match
        }
      }
    }
    return { topic, score };
  })
    .filter(({ score }) => score >= 3)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map(({ topic }) => ({
    topic: topic.label,
    explanation: topic.explanation,
    shlokas: getShlokasByIds(topic.shlokaIds),
  }));
}

/**
 * Get advice for a specific topic by its ID.
 */
export function getAdviceByTopicId(topicId: string): GitaAdviceResult | null {
  const topic = TOPIC_MAPPINGS.find((t) => t.id === topicId);
  if (!topic) return null;
  return {
    topic: topic.label,
    explanation: topic.explanation,
    shlokas: getShlokasByIds(topic.shlokaIds),
  };
}
