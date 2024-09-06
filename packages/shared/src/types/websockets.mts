import z from 'zod';

import {
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  CellCreatePayloadSchema,
  CellUpdatePayloadSchema,
  CellUpdatedPayloadSchema,
  CellRenamePayloadSchema,
  CellDeletePayloadSchema,
  AiGenerateCellPayloadSchema,
  AiGeneratedCellPayloadSchema,
  CellOutputPayloadSchema,
  DepsInstallPayloadSchema,
  DepsValidateResponsePayloadSchema,
  DepsValidatePayloadSchema,
  CellErrorPayloadSchema,
  TsServerStartPayloadSchema,
  TsServerStopPayloadSchema,
  TsServerCellDiagnosticsPayloadSchema,
  TsConfigUpdatePayloadSchema,
  TsConfigUpdatedPayloadSchema,
  AiFixDiagnosticsPayloadSchema,
  TsServerCellSuggestionsPayloadSchema,
  TsServerQuickInfoRequestPayloadSchema,
  TsServerQuickInfoResponsePayloadSchema,
} from '../schemas/websockets.mjs';

export type CellExecPayloadType = z.infer<typeof CellExecPayloadSchema>;
export type CellStopPayloadType = z.infer<typeof CellStopPayloadSchema>;
export type CellCreatePayloadType = z.infer<typeof CellCreatePayloadSchema>;
export type CellUpdatePayloadType = z.infer<typeof CellUpdatePayloadSchema>;
export type CellUpdatedPayloadType = z.infer<typeof CellUpdatedPayloadSchema>;
export type CellRenamePayloadType = z.infer<typeof CellRenamePayloadSchema>;
export type CellDeletePayloadType = z.infer<typeof CellDeletePayloadSchema>;
export type CellOutputPayloadType = z.infer<typeof CellOutputPayloadSchema>;
export type AiGenerateCellPayloadType = z.infer<typeof AiGenerateCellPayloadSchema>;
export type AiGeneratedCellPayloadType = z.infer<typeof AiGeneratedCellPayloadSchema>;
export type AiFixDiagnosticsPayloadType = z.infer<typeof AiFixDiagnosticsPayloadSchema>;

export type DepsInstallPayloadType = z.infer<typeof DepsInstallPayloadSchema>;
export type DepsValidateResponsePayloadType = z.infer<typeof DepsValidateResponsePayloadSchema>;
export type DepsValidatePayloadType = z.infer<typeof DepsValidatePayloadSchema>;

export type CellErrorPayloadType = z.infer<typeof CellErrorPayloadSchema>;

export type TsServerStartPayloadType = z.infer<typeof TsServerStartPayloadSchema>;
export type TsServerStopPayloadType = z.infer<typeof TsServerStopPayloadSchema>;
export type TsServerCellDiagnosticsPayloadType = z.infer<
  typeof TsServerCellDiagnosticsPayloadSchema
>;
export type TsServerCellSuggestionsPayloadType = z.infer<
  typeof TsServerCellSuggestionsPayloadSchema
>;

export type TsConfigUpdatePayloadType = z.infer<typeof TsConfigUpdatePayloadSchema>;
export type TsConfigUpdatedPayloadType = z.infer<typeof TsConfigUpdatedPayloadSchema>;

export type TsServerQuickInfoRequestPayloadType = z.infer<
  typeof TsServerQuickInfoRequestPayloadSchema
>;
export type TsServerQuickInfoResponsePayloadType = z.infer<
  typeof TsServerQuickInfoResponsePayloadSchema
>;
