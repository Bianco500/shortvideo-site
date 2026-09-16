import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const videos = defineCollection({
  loader: glob({ pattern: '[^_]*.yaml', base: './src/data/videos' }),
  schema: z
    .object({
      url: z.url(),
      platform: z.enum(['x', 'tiktok', 'instagram']),
      title: z.string().min(1).max(60),
      comment: z.string().min(1),
      genres: z.array(z.string()).min(1),
      author: z.string().nullish(),
      added: z.coerce.date(),
      status: z.enum(['active', 'hidden']).default('active'),
      hidden_reason: z.string().nullish(),
      embed_html: z.string().nullish(),
    })
    .refine((v) => v.platform !== 'instagram' || !!v.embed_html, {
      message: 'instagram は embed_html が必須',
    })
    .refine((v) => v.status !== 'hidden' || !!v.hidden_reason, {
      message: 'hidden にするときは hidden_reason を書く',
    }),
});

const genres = defineCollection({
  loader: glob({ pattern: '[^_]*.yaml', base: './src/data/genres' }),
  schema: z.object({
    name: z.string(),
    intro: z.string(),
    order: z.number().default(99),
  }),
});

const weeks = defineCollection({
  loader: glob({ pattern: '[^_]*.yaml', base: './src/data/weeks' }),
  schema: z.object({
    title: z.string(),
    intro: z.string(),
    featured: z.array(z.string()).max(5),
    ranking: z.array(z.string()).max(10),
  }),
});

export const collections = { videos, genres, weeks };
