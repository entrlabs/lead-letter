import { defineCollection, z } from 'astro:content';

const letters = defineCollection({
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
    series: z.string().default('The Lead Letter'),
    slug: z.string().optional(),
    tags: z.array(z.string()).default([]),
  }),
});

export const collections = { letters };
