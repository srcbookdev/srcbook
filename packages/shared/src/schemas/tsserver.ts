import z from 'zod';

export const TsServerLocationSchema = z.object({
  line: z.number(),
  offset: z.number(),
});

export const TsServerDiagnosticSchema = z.object({
  code: z.number(),
  category: z.string(),
  text: z.string(),
  start: TsServerLocationSchema,
  end: TsServerLocationSchema,
});
