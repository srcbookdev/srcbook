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

export type CommandMessageType = {
  type: 'command';
  planId: string;
  command: 'npm install';
  packages: string[];
  description: string;
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

//////////////////////////////////////////
// When streaming file objects from LLM //
//////////////////////////////////////////

export type DescriptionChunkType = {
  type: 'description';
  planId: string;
  data: { content: string };
};

export type FileActionChunkType = {
  type: 'file';
  description: string;
  modified: string;
  original: string | null;
  basename: string;
  dirname: string;
  path: string;
};

export type CommandActionChunkType = {
  type: 'command';
  description: string;
  command: 'npm install';
  packages: string[];
};

export type ActionChunkType = {
  type: 'action';
  planId: string;
  data: FileActionChunkType | CommandActionChunkType;
};
