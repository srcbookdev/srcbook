import z from 'zod';

import { TsServerLocationSchema, TsServerDiagnosticSchema } from '../schemas/tsserver.js';

export type TsServerLocationType = z.infer<typeof TsServerLocationSchema>;
export type TsServerDiagnosticType = z.infer<typeof TsServerDiagnosticSchema>;
