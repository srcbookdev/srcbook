export type FileDiffType = {
  modified: string;
  original: string | null;
  basename: string;
  dirname: string;
  path: string;
  additions: number;
  deletions: number;
  type: 'edit' | 'create' | 'delete';
};

export type UserMessageType = {
  type: 'user';
  message: string;
};

export type CommandMessageType = {
  type: 'command';
  command: string;
  description: string;
};

export type DiffMessageType = {
  type: 'diff';
  diff: FileDiffType[];
};

export type PlanMessageType = {
  type: 'plan';
  content: string;
};

export type MessageType = UserMessageType | DiffMessageType | CommandMessageType | PlanMessageType;

export type HistoryType = Array<MessageType>;
