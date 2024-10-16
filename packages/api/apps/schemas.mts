import z from 'zod';

export const CreateAppSchema = z.object({
  name: z.string(),
  prompt: z.string().optional(),
});

export const CreateAppWithAiSchema = z.object({
  name: z.string(),
  prompt: z.string(),
});

export type CreateAppSchemaType = z.infer<typeof CreateAppSchema>;
export type CreateAppWithAiSchemaType = z.infer<typeof CreateAppWithAiSchema>;
