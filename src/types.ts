export interface FsObjectType {
  name: string;
  path: string;
  parentPath: string;
  isDirectory: boolean;
}

export interface FsObjectResultType {
  path: string;
  entries: FsObjectType[];
}

type BaseCellType = {
  id: string;
};

export type SectionCellType = BaseCellType & {
  type: 'section';
  input: {
    text: string;
    depth: number;
  };
  output: null;
};

export type CodeCellType = BaseCellType & {
  type: 'code';
  input: {
    text: string;
    lang: number;
  };
  output: { error: boolean; stdout: string; result: string } | null;
};

export type CellType = SectionCellType | CodeCellType;
