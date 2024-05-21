export type CellType = any;

export type SessionType = {
  id: string;
  hash: string;
  path: string;
  cells: CellType[];
};
