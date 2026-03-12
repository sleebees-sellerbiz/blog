import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const article = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/article' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    createdAt: z.coerce.date(),
    author: z.string(),
    category: z.string(),
    tags: z.array(z.string()),
    featured: z.boolean().default(false),
    thumbnail: z.string().optional(),
  }),
});

export const collections = { article };
