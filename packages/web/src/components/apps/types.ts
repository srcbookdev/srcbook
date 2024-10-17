export type FileType = {
  type: 'file';
  modified: string;
  original: string | null;
  path: string;
  basename: string;
  dirname: string;
  description: string;
};

export type CommandType = {
  type: 'command';
  content: string;
  description: string;
};

export type PlanItemType = FileType | CommandType;

export type PlanType = {
  description: string;
  actions: Array<PlanItemType>;
};
