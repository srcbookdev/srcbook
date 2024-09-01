import z from 'zod';

import {
  TsServerLocationSchema,
  TsServerDiagnosticSchema,
  TsServerSuggestionSchema,
  TsServerQuickInfoRequestSchema,
  TsServerQuickInfoResponseSchema,
} from '../schemas/tsserver.js';

export type TsServerLocationType = z.infer<typeof TsServerLocationSchema>;
export type TsServerDiagnosticType = z.infer<typeof TsServerDiagnosticSchema>;
export type TsServerSuggestionType = z.infer<typeof TsServerSuggestionSchema>;
export type TsServerQuickInfoRequestType = z.infer<typeof TsServerQuickInfoRequestSchema>;
export type TsServerQuickInfoResponseType = z.infer<typeof TsServerQuickInfoResponseSchema>;
