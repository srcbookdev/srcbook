import z from 'zod';

export const FileSchema = z.object({
  path: z.string(),
  name: z.string(),
  source: z.string(),
  binary: z.boolean(),
});
