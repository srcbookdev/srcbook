import z from 'zod';
import { UIComponentSchema, UIEventSchema } from '../schemas/ui.js';

export type UIComponentType = z.infer<typeof UIComponentSchema>;
export type UIEventType = z.infer<typeof UIEventSchema>;
