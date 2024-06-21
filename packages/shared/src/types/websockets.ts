import z from 'zod';

import {
  CellExecPayloadSchema,
  CellStopPayloadSchema,
  CellUpdatePayloadSchema,
  CellUpdatedPayloadSchema,
  CellOutputPayloadSchema,
  DepsInstallPayloadSchema,
  DepsValidateResponsePayloadSchema,
  DepsValidatePayloadSchema,
  CellErrorPayloadSchema,
} from '../schemas/websockets.js';

export type CellExecPayloadType = z.infer<typeof CellExecPayloadSchema>;
export type CellStopPayloadType = z.infer<typeof CellStopPayloadSchema>;
export type CellUpdatePayloadType = z.infer<typeof CellUpdatePayloadSchema>;
export type CellUpdatedPayloadType = z.infer<typeof CellUpdatedPayloadSchema>;
export type CellOutputPayloadType = z.infer<typeof CellOutputPayloadSchema>;

export type DepsInstallPayloadType = z.infer<typeof DepsInstallPayloadSchema>;
export type DepsValidateResponsePayloadType = z.infer<typeof DepsValidateResponsePayloadSchema>;
export type DepsValidatePayloadType = z.infer<typeof DepsValidatePayloadSchema>;

export type CellErrorPayloadType = z.infer<typeof CellErrorPayloadSchema>;
