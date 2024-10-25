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
  planId: string;
};

export type NpmInstallCommand = {
  type: 'command';
  command: 'npm install';
  packages: string[];
  description: string;
};

export type CommandMessageType = NpmInstallCommand & {
  planId: string;
};

export type DiffMessageType = {
  type: 'diff';
  planId: string;
  version: string;
  diff: FileDiffType[];
};

export type PlanMessageType = {
  type: 'plan';
  planId: string;
  content: string;
};

export type MessageType = UserMessageType | DiffMessageType | CommandMessageType | PlanMessageType;

export type HistoryType = Array<MessageType>;
