import { glob } from 'astro/loaders'
import { defineCollection, z } from 'astro:content'

const wiki = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/wiki' }),
  schema: z.object({
    title: z.string(),
    description: z.string(),
    section: z.enum(['Guides', 'Concepts', 'API', 'Recipes']),
    navTitle: z.string().optional(),
    order: z.number(),
  }),
})

export const collections = { wiki }
