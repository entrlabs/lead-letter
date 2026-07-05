import { defineCollection, z } from 'astro:content';

const signalLane = z.object({
  label: z.string(),
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
  level: z.string(),
  state: z.string(),
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
    tags: z.array(z.string()).default([]),
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
      tension: z.string().optional(),
      move: z.string().optional(),
      question: z.string().optional(),
      concepts: z.array(signalInsightConcept).optional(),
      lanes: z.array(signalInsightLane).optional(),
    }).optional(),
  }),
});

export const collections = { signals };
