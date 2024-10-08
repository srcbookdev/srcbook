import z from 'zod';

export const FileSchema = z.object({
  path: z.string(),
  source: z.string(),
  binary: z.boolean(),
});
