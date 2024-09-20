import z from 'zod';

export const CreateAppSchema = z.object({
  name: z.string(),
  language: z.union([z.literal('typescript'), z.literal('javascript')]),
  prompt: z.string().optional(),
});

export type CreateAppSchemaType = z.infer<typeof CreateAppSchema>;
