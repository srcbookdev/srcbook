export type FileType = {
  type: 'file';
  modified: string;
  original: string | null;
  path: string;
  basename: string;
  dirname: string;
  description: string;
};

type NpmInstallCommandType = {
  type: 'command';
  command: 'npm install';
  packages: string[];
  description: string;
};

export type CommandType = NpmInstallCommandType;

export type PlanItemType = FileType | CommandType;

export type PlanType = {
  description: string;
  actions: Array<PlanItemType>;
};
