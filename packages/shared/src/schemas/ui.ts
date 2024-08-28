import z from 'zod';

export const UIComponentSchema = z.object({
  id: z.string(),
  type: z.literal('text'),
  label: z.optional(z.string()),
  value: z.optional(z.string()),
  placeholder: z.optional(z.string()),
});

export const UIEventSchema = z.object({
  type: z.literal('submit'),
  target: z.object({
    id: z.string(),
    value: z.string(),
  }),
});
