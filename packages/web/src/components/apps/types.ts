export type FileType = {
  type: 'file';
  modified: string;
  original: string | null; // null if this is a new file. Consider using an enum for 'edit' | 'create' | 'delete' instead.
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

export type FileDiffType = {
  modified: string;
  original: string | null;
  basename: string;
  dirname: string;
  path: string;
  additions: number; // lines added
  deletions: number; // lines deleted
  type: 'edit' | 'create' | 'delete';
};
