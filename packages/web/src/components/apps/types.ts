import { CommandMessageType } from '@srcbook/shared';

export type FileType = {
  type: 'file';
  modified: string;
  original: string | null;
  path: string;
  basename: string;
  dirname: string;
  description: string;
};

// TODO this should likely all be shared types eventually.
export type PlanItemType = FileType | CommandMessageType;

export type PlanType = {
  id: string;
  query: string;
  description: string;
  actions: Array<PlanItemType>;
};
