import { defineCollection, z } from 'astro:content';

const topicTags = ['business', 'founders', 'managers', 'education', 'policy', 'market', 'community', 'global', 'work', 'tech', 'psych', 'society'] as const;

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

const signals = defineCollection({
  type: 'content',
  schema: z.object({
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
  }),
});

export const collections = { signals };
