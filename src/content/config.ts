import { defineCollection, z } from 'astro:content';

const topicTags = ['business', 'founders', 'managers', 'education', 'policy', 'market', 'community', 'global', 'work', 'tech', 'psych', 'society'] as const;
const signalFieldLabels = ['Business', 'Founders', 'Managers', 'Education', 'Policy', 'Market', 'Community', 'Global', 'Work', 'Tech', 'Psych', 'Society'] as const;
const signalFieldSet = new Set<string>(signalFieldLabels);
const matrixRequiredFromIssue = 27;
const matrixRequiredFromWeek = 202627;

const signalLane = z.object({
  label: z.string(),
  field: z.string().optional(),
  state: z.string(),
  level: z.string(),
  score: z.number().min(0).max(100).optional(),
  direction: z.enum(['up', 'down', 'steady']).optional(),
  brief: z.string().optional(),
});

const signalInsightConcept = z.object({
  label: z.string(),
  type: z.string().default('service'),
});

const signalInsightLane = z.object({
  label: z.string(),
  field: z.string().optional(),
  level: z.string(),
  state: z.string(),
  importance: z.number().min(0).max(100).optional(),
  usefulness: z.number().min(0).max(100).optional(),
  timeframe: z.enum(['now', 'later']).optional(),
  quadrant: z.enum(['high-now', 'high-later', 'low-now', 'low-later']).optional(),
  classification: z.string().optional(),
  strength: z.string().optional(),
  sourceWeek: z.string().optional(),
  meaning: z.string().optional(),
});

function sortableWeek(week?: string) {
  const match = week?.match(/^(\d{4})-W(\d{2})$/);
  return match ? Number(`${match[1]}${match[2]}`) : undefined;
}

const signalSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  author: z.string().default('Joseph E. Iesue'),
  publication: z.string().default('EntrLabs - The Lead Letter'),
  issue: z.number(),
  featured: z.boolean().default(false),
  week: z.string().optional(),
  series: z.string().default('Signals Brief'),
  tags: z.array(z.enum(topicTags)).default([]),
  signalBoard: z.object({
    signal: z.string(),
    micro: z.string(),
    tension: z.string(),
    move: z.string(),
    question: z.string(),
    flow: z.array(z.string()).min(3).max(5),
    motionWords: z.array(z.string()).min(4).max(8),
    lanes: z.array(signalLane).min(3).max(4),
  }).optional(),
  signalInsight: z.object({
    primaryTheme: z.string().optional(),
    signal: z.string().optional(),
    micro: z.string().optional(),
    concepts: z.array(signalInsightConcept).optional(),
    lanes: z.array(signalInsightLane).optional(),
  }).optional(),
}).superRefine((data, ctx) => {
  const requiresMatrix = data.issue >= matrixRequiredFromIssue || (sortableWeek(data.week) ?? 0) >= matrixRequiredFromWeek;

  if (!requiresMatrix) return;

  if (!data.signalInsight) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signalInsight'],
      message: 'Issue 27+ Lead Letters must include signalInsight with four evaluated decision-matrix lanes.',
    });
    return;
  }

  const lanes = data.signalInsight.lanes;

  if (!lanes) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signalInsight', 'lanes'],
      message: 'Issue 27+ Lead Letters must include four signalInsight.lanes entries.',
    });
    return;
  }

  if (lanes.length !== 4) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['signalInsight', 'lanes'],
      message: 'Issue 27+ Lead Letters must include exactly four Signal Map lanes.',
    });
  }

  lanes.forEach((lane, index) => {
    const path = ['signalInsight', 'lanes', index];
    const field = lane.field ?? lane.label;

    if (!signalFieldSet.has(field)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'field'],
        message: `Signal Map field must use one of the controlled public labels: ${signalFieldLabels.join(', ')}.`,
      });
    }

    if (typeof lane.importance !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'importance'],
        message: 'Signal Map lanes must include an importance score from 0 to 100.',
      });
    }

    if (typeof lane.usefulness !== 'number') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [...path, 'usefulness'],
        message: 'Signal Map lanes must include a usefulness score from 0 to 100.',
      });
    }
  });
});

const signals = defineCollection({
  type: 'content',
  schema: signalSchema,
});

const fieldNoteSchema = z.object({
  title: z.string(),
  description: z.string(),
  date: z.coerce.date(),
  author: z.string().default('Joseph E. Iesue'),
  publication: z.string().default('EntrLabs - The Lead Letter'),
  sourceBrief: z.string().optional(),
  featured: z.boolean().default(false),
  tags: z.array(z.string()).default([]),
});

const fieldnotes = defineCollection({
  type: 'content',
  schema: fieldNoteSchema,
});

export const collections = { signals, fieldnotes };
