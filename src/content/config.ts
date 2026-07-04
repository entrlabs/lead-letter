import { defineCollection, z } from 'astro:content';

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
    slug: z.string().optional(),
    tags: z.array(z.string()).default([]),
    signalBoard: z.object({
      signal: z.string(),
      micro: z.string(),
      tension: z.string(),
      move: z.string(),
      question: z.string(),
      flow: z.array(z.string()).min(3).max(5),
      motionWords: z.array(z.string()).min(4).max(8),
      lanes: z.array(z.object({
        label: z.string(),
        state: z.string(),
        level: z.string(),
      })).min(3).max(4),
    }).optional(),
  }),
});

export const collections = { signals };
