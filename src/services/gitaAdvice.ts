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
    shlokaIds: ['BG2.11', 'BG2.14', 'BG6.35', 'BG18.66'],
    explanation:
      'The Gita teaches that anxiety arises from attachment to outcomes. ' +
      'Krishna counsels Arjuna that the wise grieve neither for the living nor the dead (2.11), ' +
      'that pleasure and pain are fleeting like seasons (2.14), and that a restless mind ' +
      'can be steadied through practice and detachment (6.35). ' +
      'Ultimately, surrendering to the divine frees one from all fear (18.66).',
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
    shlokaIds: ['BG2.47', 'BG3.35', 'BG18.47', 'BG3.8'],
    explanation:
      'Krishna\'s most famous teaching: "You have the right to action alone, never to its fruits" (2.47). ' +
      'One should perform their own dharma, even imperfectly, rather than follow another\'s path perfectly (3.35, 18.47). ' +
      'Action is always superior to inaction — even the body cannot be maintained without work (3.8).',
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
    shlokaIds: ['BG2.20', 'BG2.22', 'BG2.27', 'BG2.13'],
    explanation:
      'The Gita offers profound comfort in grief. The soul is eternal — it is never born and never dies (2.20). ' +
      'Just as a person discards old clothes and puts on new ones, the soul discards old bodies (2.22). ' +
      'Death is certain for the born, and rebirth is certain for the dead — one should not grieve over the inevitable (2.27). ' +
      'The soul passes through childhood, youth, and old age, then to another body — the wise are not deluded by this (2.13).',
  },
  {
    id: 'anger',
    label: 'Struggling With Anger',
    prompt: 'I am struggling to control my anger',
    keywords: [
      'anger', 'angry', 'rage', 'furious', 'frustrated', 'frustration', 'mad',
      'irritated', 'resentment', 'hatred', 'hate', 'temper', 'hostile',
    ],
    shlokaIds: ['BG2.62', 'BG2.63', 'BG16.21', 'BG5.26'],
    explanation:
      'The Gita maps the destructive chain: from dwelling on sense objects comes attachment, ' +
      'from attachment comes desire, from desire comes anger, and from anger comes delusion and ruin (2.62-63). ' +
      'Desire, anger, and greed are the three gates to self-destruction (16.21). ' +
      'But those who control their mind find peace — liberation is near for the disciplined (5.26).',
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
    shlokaIds: ['BG3.8', 'BG3.4', 'BG6.5', 'BG18.59'],
    explanation:
      'Krishna firmly rejects inaction. Perform your prescribed duties — action is superior to inaction (3.8). ' +
      'No one can remain without action even for a moment; nature compels everyone to act (3.4). ' +
      'One must elevate oneself by one\'s own mind — the self is its own friend and its own enemy (6.5). ' +
      'If ego makes you think "I shall not fight," your own nature will compel you (18.59).',
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
    shlokaIds: ['BG2.47', 'BG2.48', 'BG12.12', 'BG5.10'],
    explanation:
      'The cornerstone of the Gita: perform action without attachment to results (2.47). ' +
      'Perform actions established in yoga, abandoning attachment, remaining even-minded in success and failure (2.48). ' +
      'If you cannot practice detachment, then renounce the fruits of all actions (12.12). ' +
      'One who acts offering all to the divine, abandoning attachment, is untouched by sin as a lotus leaf by water (5.10).',
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
    shlokaIds: ['BG2.70', 'BG6.7', 'BG5.29', 'BG2.66'],
    explanation:
      'Peace comes to those who remain unmoved, like the ocean receiving rivers without being disturbed (2.70). ' +
      'The person of steady mind, who has conquered the self, is already at peace — undisturbed by cold or heat, ' +
      'pleasure or pain, honor or dishonor (6.7). ' +
      'Knowing the Lord as the enjoyer of all sacrifices and friend of all beings brings peace (5.29). ' +
      'There is no wisdom nor meditation for the unsteady; without meditation there is no peace (2.66).',
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
    shlokaIds: ['BG6.5', 'BG4.38', 'BG18.37', 'BG4.42'],
    explanation:
      'The Gita declares: elevate yourself by your own self — do not degrade yourself, ' +
      'for the self alone is its own friend and its own enemy (6.5). ' +
      'Nothing in this world purifies like knowledge — the perfected yogi discovers it within in due time (4.38). ' +
      'That which seems like poison at first but becomes nectar — that is sattvic happiness born of self-realization (18.37). ' +
      'Therefore, cutting asunder the doubt born of ignorance in your heart with the sword of knowledge, arise! (4.42).',
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
    shlokaIds: ['BG6.9', 'BG12.13', 'BG16.1', 'BG12.15'],
    explanation:
      'The Gita teaches equanimity toward all: a person is distinguished who regards friends and foes, ' +
      'the righteous and the wicked with an equal eye (6.9). ' +
      'The ideal devotee bears no ill will toward any being, is friendly and compassionate, ' +
      'free from possessiveness and ego (12.13). Divine qualities include fearlessness, purity, ' +
      'charity, self-restraint, gentleness, and absence of malice (16.1). ' +
      'One who is a source of no disturbance and who is not disturbed by others is dear to the Lord (12.15).',
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
    shlokaIds: ['BG6.26', 'BG6.35', 'BG6.34', 'BG2.67'],
    explanation:
      'Arjuna himself told Krishna: "The mind is restless, turbulent, powerful — ' +
      'I think it is as hard to control as the wind" (6.34). Krishna agrees it is difficult, ' +
      'but says it can be controlled through practice (abhyasa) and detachment (vairagya) (6.35). ' +
      'Whenever the restless mind wanders, bring it back under the control of the self (6.26). ' +
      'As a boat on water is carried away by a strong wind, even one wandering sense can carry away the mind (2.67).',
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
    shlokaIds: ['BG2.47', 'BG2.48', 'BG6.5', 'BG18.48'],
    explanation:
      'True success according to the Gita is excellence in action without attachment to results (2.47). ' +
      'Perform your work with equanimity, abandoning attachment — evenness of mind is yoga (2.48). ' +
      'Elevate yourself through your own effort; the self is its own friend and enemy (6.5). ' +
      'Every endeavor is covered by some defect as fire by smoke — one should not abandon work ' +
      'born of one\'s nature, even if it is imperfect (18.48).',
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
    shlokaIds: ['BG4.39', 'BG9.22', 'BG7.19', 'BG18.66'],
    explanation:
      'The Gita honors sincere seekers: the faithful who are devoted to knowledge ' +
      'and who control their senses quickly attain supreme peace (4.39). ' +
      'Krishna promises: to those who worship with undivided devotion, thinking of no other, ' +
      'He personally carries what they need (9.22). ' +
      'After many births, the wise person realizes that all is the divine — such a great soul is rare (7.19). ' +
      'The ultimate assurance: "Abandon all varieties of dharma and surrender unto Me. ' +
      'I shall deliver you from all sinful reactions. Do not fear" (18.66).',
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
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);

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
    .filter(({ score }) => score > 0)
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
