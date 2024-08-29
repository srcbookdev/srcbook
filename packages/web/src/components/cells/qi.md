Quick Info Spec

`tsserver:cell:quickinfo:request`
`tsserver:cell:quickinfo:response`

```ts
export const TsServerLocationSchema = z.object({
  line: z.number(),
  offset: z.number(),
});

export const TsServerQuickInfoRequestSchema = z.object({
  location: TsServerLocationSchema,
});

export const TsServerQuickInfoResponseSchema = z.object({
  kind: z.string(),
  kindModifiers: z.string(),
  start: TsServerLocationSchema,
  end: TsServerLocationSchema,
  displayString: z.string(),
  documentation: z.string(),
  tags: z.array(z.string()),
});
```
