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

export const TsServerSuggestionSchema = z.object({
  code: z.number(),
  category: z.string(),
  text: z.string(),
  start: TsServerLocationSchema,
  end: TsServerLocationSchema,
});

export const TsServerQuickInfoRequestSchema = z.object({
  location: TsServerLocationSchema,
});

export const TsServerJSDocSchema = z
  .union([
    z.string(),
    z.array(
      z.object({
        text: z.string(),
        kind: z.string(),
      }),
    ),
  ])
  .optional();

export const TsServerJsDocTagsSchema = z.array(
  z.object({
    name: z.string(),
    text: TsServerJSDocSchema,
  }),
);

export const TsServerQuickInfoResponseSchema = z.object({
  kind: z.string(),
  kindModifiers: z.string(),
  start: TsServerLocationSchema,
  end: TsServerLocationSchema,
  displayString: z.string(),
  documentation: TsServerJSDocSchema,
  tags: TsServerJsDocTagsSchema,
});

export const TsServerDefinitionLocationSchema = z.any();
// .object({
//   file: z.string(),
//   start: TsServerLocationSchema,
//   end: TsServerLocationSchema,
//   contextStart: TsServerLocationSchema.optional(),
//   contextEnd: TsServerLocationSchema.optional(),
// })
// .optional();
