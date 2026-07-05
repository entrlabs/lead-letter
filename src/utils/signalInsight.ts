import type { CollectionEntry } from 'astro:content';

export type SignalInsightLane = {
  label: string;
  level: string;
  state: string;
  importance?: number;
  classification?: string;
  strength?: string;
  sourceWeek?: string;
  meaning?: string;
};

export type SignalInsight = {
  primaryTheme: string;
  signal: string;
  micro: string;
  concepts: Array<{ label: string; type: string }>;
  lanes: SignalInsightLane[];
};

const themeKeywords = [
  {
    theme: 'Trust',
    type: 'service',
    keywords: ['trust', 'proof', 'evidence', 'customer', 'believe', 'price', 'buy', 'rely'],
  },
  {
    theme: 'Leadership',
    type: 'leadership',
    keywords: ['leadership', 'leader', 'manager', 'management', 'responsibility', 'decision', 'judgment'],
  },
  {
    theme: 'Learning',
    type: 'learning',
    keywords: ['learning', 'student', 'education', 'college', 'training', 'career', 'skill', 'practice'],
  },
  {
    theme: 'Work',
    type: 'work',
    keywords: ['work', 'worker', 'role', 'organization', 'team', 'job', 'workplace'],
  },
  {
    theme: 'Technology',
    type: 'technology',
    keywords: ['ai', 'technology', 'tool', 'automation', 'system', 'digital'],
  },
  {
    theme: 'Service',
    type: 'service',
    keywords: ['service', 'serve', 'help', 'people', 'community', 'support'],
  },
];

const fallbackConcepts = ['Service', 'Leadership', 'Learning', 'Work', 'Judgment'];

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function scoreTheme(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    const matches = text.match(new RegExp(`\\b${keyword}\\b`, 'g'));
    return score + (matches?.length ?? 0);
  }, 0);
}

function titleCase(value: string) {
  return value
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase())
    .trim();
}

function firstCallout(body: string) {
  const match = body.match(/> \[!(?:NOTE|TIP|LEADERS)\]\n((?:>.*(?:\n|$))+?)/i);
  return match?.[1]
    .replace(/^>\s?/gm, '')
    .replace(/\*\*/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function importanceFromLevel(level: string, index = 0) {
  const normalized = level.toLowerCase();
  if (normalized.includes('prime') || normalized.includes('urgent') || normalized.includes('leading')) return 90;
  if (normalized.includes('confirmed')) return 88;
  if (normalized.includes('high')) return 86;
  if (normalized.includes('rising') || normalized.includes('strong')) return 82;
  if (normalized.includes('active')) return 76;
  if (normalized.includes('emerging') || normalized.includes('worth')) return 70;
  if (normalized.includes('view') || normalized.includes('low')) return 62;
  if (normalized.includes('watch')) return 58;
  return Math.max(48, 72 - index * 6);
}

function conceptsFromEntry(entry: CollectionEntry<'signals'>, activeThemes: typeof themeKeywords) {
  const tags = entry.data.tags.map(titleCase);
  const fromThemes = activeThemes.map((theme) => theme.theme);
  const fromTitle = entry.data.title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ''))
    .filter((word) => word.length > 5)
    .slice(0, 3)
    .map(titleCase);

  return [...fromThemes, ...tags, ...fromTitle, ...fallbackConcepts]
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 7)
    .map((label, index) => ({
      label,
      type: activeThemes[index % activeThemes.length]?.type ?? 'service',
    }));
}

export function getSignalInsight(entry: CollectionEntry<'signals'>): SignalInsight {
  const curated = entry.data.signalInsight;
  const searchableText = normalize([
    entry.data.title,
    entry.data.description,
    entry.data.tags.join(' '),
    entry.body,
  ].join(' '));

  const rankedThemes = themeKeywords
    .map((theme) => ({ ...theme, score: scoreTheme(searchableText, theme.keywords) }))
    .sort((a, b) => b.score - a.score);

  const activeThemes = rankedThemes.filter((theme) => theme.score > 0).slice(0, 4);
  const themeSet = activeThemes.length ? activeThemes : themeKeywords.slice(0, 4);
  const primaryTheme = curated?.primaryTheme ?? themeSet[0].theme;
  const bodySignal = firstCallout(entry.body);

  return {
    primaryTheme,
    signal: curated?.signal ?? bodySignal ?? entry.data.title,
    micro: curated?.micro ?? entry.data.description,
    concepts: curated?.concepts ?? conceptsFromEntry(entry, themeSet),
    lanes: (curated?.lanes ?? themeSet.map((theme, index) => ({
      label: theme.theme,
      level: index === 0 ? 'Leading' : theme.score > 2 ? 'Rising' : 'Watching',
      state: `${theme.theme} is a visible theme in this brief.`,
    }))).map((lane, index) => ({
      ...lane,
      importance: lane.importance ?? importanceFromLevel(`${lane.level} ${lane.strength ?? ''} ${lane.classification ?? ''}`, index),
    })),
  };
}
