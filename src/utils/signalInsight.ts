import type { CollectionEntry } from 'astro:content';

export type SignalInsightLane = {
  label: string;
  field?: string;
  level: string;
  state: string;
  score?: number;
  direction?: 'up' | 'down' | 'steady';
  brief?: string;
  importance?: number;
  usefulness?: number;
  timeframe?: 'now' | 'later';
  quadrant?: 'high-now' | 'high-later' | 'low-now' | 'low-later';
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

const signalFields = [
  {
    field: 'Education',
    type: 'education',
    keywords: ['student', 'students', 'school', 'college', 'university', 'education', 'degree', 'course', 'advising', 'financial aid', 'learning'],
  },
  {
    field: 'Work',
    type: 'work',
    keywords: ['work', 'worker', 'workers', 'job', 'career', 'labor', 'manager', 'role', 'workplace', 'hiring', 'organization'],
  },
  {
    field: 'Tech',
    type: 'tech',
    keywords: ['ai', 'technology', 'tech', 'tool', 'automation', 'digital', 'platform', 'data', 'system'],
  },
  {
    field: 'Society',
    type: 'society',
    keywords: ['trust', 'proof', 'evidence', 'credibility', 'claim', 'claims', 'customer', 'believe', 'verify', 'rely'],
  },
  {
    field: 'Market',
    type: 'market',
    keywords: ['cost', 'price', 'debt', 'loan', 'funding', 'investment', 'affordability', 'capital', 'financial'],
  },
  {
    field: 'Founders',
    type: 'founders',
    keywords: ['market', 'consumer', 'customer', 'demand', 'competition', 'founder', 'startup', 'venture'],
  },
  {
    field: 'Policy',
    type: 'policy',
    keywords: ['policy', 'law', 'rule', 'regulation', 'federal', 'government', 'institutional'],
  },
  {
    field: 'Community',
    type: 'community',
    keywords: ['people', 'leadership', 'culture', 'service', 'dignity', 'agency', 'support', 'community'],
  },
];

const fallbackConcepts = ['Education', 'Work', 'Tech', 'Society', 'Founders', 'Managers'];

function normalize(value: unknown) {
  return String(value ?? '').toLowerCase();
}

function scoreTheme(text: string, keywords: string[]) {
  return keywords.reduce((score, keyword) => {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const matches = text.match(new RegExp(`\\b${escaped}\\b`, 'g'));
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

function sameLane(a?: string, b?: string) {
  return normalize(a).trim() === normalize(b).trim();
}

function conceptsFromEntry(entry: CollectionEntry<'signals'>, activeFields: typeof signalFields) {
  const tags = entry.data.tags.map(titleCase);
  const fromFields = activeFields.map((theme) => theme.field);
  const fromTitle = entry.data.title
    .split(/\s+/)
    .map((word) => word.replace(/[^a-zA-Z]/g, ''))
    .filter((word) => word.length > 5)
    .slice(0, 3)
    .map(titleCase);

  return [...fromFields, ...tags, ...fromTitle, ...fallbackConcepts]
    .filter(Boolean)
    .filter((item, index, array) => array.findIndex((candidate) => candidate.toLowerCase() === item.toLowerCase()) === index)
    .slice(0, 7)
    .map((label, index) => ({
      label,
      type: activeFields[index % activeFields.length]?.type ?? 'service',
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

  const rankedFields = signalFields
    .map((theme) => ({ ...theme, score: scoreTheme(searchableText, theme.keywords) }))
    .sort((a, b) => b.score - a.score);

  const activeFields = rankedFields.filter((theme) => theme.score > 0).slice(0, 4);
  const fieldSet = activeFields.length ? activeFields : signalFields.slice(0, 4);
  const primaryTheme = curated?.primaryTheme ?? fieldSet[0].field;
  const bodySignal = firstCallout(entry.body);

  return {
    primaryTheme,
    signal: curated?.signal ?? bodySignal ?? entry.data.title,
    micro: curated?.micro ?? entry.data.description,
    concepts: curated?.concepts ?? conceptsFromEntry(entry, fieldSet),
    lanes: (curated?.lanes ?? fieldSet.map((theme, index) => ({
      label: theme.field,
      field: theme.field,
      level: index === 0 ? 'Leading' : theme.score > 2 ? 'Rising' : 'Watching',
      state: `${theme.field} is a visible field in this brief.`,
    }))).map((lane, index) => ({
      ...lane,
      field: lane.field ?? lane.label,
    })).map((lane, index) => {
      const boardLane = entry.data.signalBoard?.lanes.find((candidate) =>
        sameLane(candidate.field, lane.field) ||
        sameLane(candidate.label, lane.label) ||
        sameLane(candidate.label, lane.field) ||
        sameLane(candidate.field, lane.label)
      );
      const score = lane.score ?? boardLane?.score;
      const direction = lane.direction ?? boardLane?.direction;

      return {
        ...lane,
        score,
        direction,
        brief: lane.brief ?? boardLane?.brief,
        importance: lane.importance ?? score ?? importanceFromLevel(`${lane.level} ${lane.strength ?? ''} ${lane.classification ?? ''}`, index),
      };
    }),
  };
}
