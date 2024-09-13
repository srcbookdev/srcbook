import z from 'zod';

import {
  TsServerLocationSchema,
  TsServerDiagnosticSchema,
  TsServerSuggestionSchema,
  TsServerQuickInfoRequestSchema,
  TsServerJSDocSchema,
  TsServerJsDocTagsSchema,
  TsServerQuickInfoResponseSchema,
  TsServerDefinitionLocationSchema,
} from '../schemas/tsserver.mjs';

export type TsServerLocationType = z.infer<typeof TsServerLocationSchema>;
export type TsServerDiagnosticType = z.infer<typeof TsServerDiagnosticSchema>;
export type TsServerSuggestionType = z.infer<typeof TsServerSuggestionSchema>;
export type TsServerQuickInfoRequestType = z.infer<typeof TsServerQuickInfoRequestSchema>;
export type TsServerJSDocType = z.infer<typeof TsServerJSDocSchema>;
export type TsServerJsDocTagsType = z.infer<typeof TsServerJsDocTagsSchema>;
export type TsServerQuickInfoResponseType = z.infer<typeof TsServerQuickInfoResponseSchema>;
export type TsServerDefinitionLocationSchemaType = z.infer<typeof TsServerDefinitionLocationSchema>;
