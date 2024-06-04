import { createContext, useCallback, useContext, useState, ReactNode, useRef } from 'react';
import { CellType, OutputType } from '@/types';

import { randomid } from '@/lib/utils';
import type { CodeCellType, MarkdownCellType } from '@/types';

export function buildCodeCell(attrs: Partial<CodeCellType> = {}): CodeCellType {
  return {
    source: '',
    language: 'javascript',
    filename: 'untitled.mjs',
    status: 'idle',
    ...attrs,
    id: randomid(),
    type: 'code',
  };
}

export function buildMarkdownCell(attrs: Partial<MarkdownCellType> = {}): MarkdownCellType {
  return {
    text: '',
    ...attrs,
    id: randomid(),
    type: 'markdown',
  };
}

type OutputStateType = Record<string, OutputType[]>;

interface CellsContextType {
  cells: CellType[];
  setCells: React.Dispatch<React.SetStateAction<CellType[]>>;
  updateCell: (cell: CellType) => void;
  removeCell: (cell: CellType) => void;
  insertCellAt: (cell: CellType, idx: number) => void;
  createCodeCell: (idx: number, attrs?: Partial<CodeCellType>) => CodeCellType;
  createMarkdownCell: (idx: number, attrs?: Partial<MarkdownCellType>) => MarkdownCellType;
  hasOutput: (id: string, type?: 'stdout' | 'stderr') => boolean;
  getOutput: (id: string, type?: 'stdout' | 'stderr') => Array<OutputType>;
  setOutput: (id: string, output: OutputType | OutputType[]) => void;
  clearOutput: (id: string) => void;
}

const CellsContext = createContext<CellsContextType | undefined>(undefined);

export const CellsProvider: React.FC<{ initialCells: CellType[]; children: ReactNode }> = ({
  initialCells,
  children,
}) => {
  const [cells, setCells] = useState<CellType[]>(initialCells);

  // This needs to be a ref in order for writes to not clobber each other.
  const outputRef = useRef<OutputStateType>({});
  const [_output, _setOutput] = useState<OutputStateType>(outputRef.current);

  function internalSetOutput(output: OutputStateType) {
    outputRef.current = output;
    _setOutput(output);
  }

  const updateCell = useCallback(
    (cell: CellType) => {
      cell.type === 'code' &&
        console.log('updateCell called on the client', {
          type: cell.type,
          id: cell.id,
          status: cell.status,
        });
      setCells(cells.map((c) => (c.id === cell.id ? cell : c)));
    },
    [cells],
  );

  const removeCell = useCallback(
    (cell: CellType) => {
      setCells(cells.filter((c) => c.id !== cell.id));
    },
    [cells],
  );

  const insertCellAt = useCallback(
    (cell: CellType, idx: number) => {
      const copy = [...cells];
      copy.splice(idx, 0, cell);
      setCells(copy);
    },
    [cells],
  );

  const createCodeCell = useCallback(
    (idx: number, attrs?: Partial<CodeCellType>) => {
      const cell = buildCodeCell(attrs);
      insertCellAt(cell, idx);
      return cell;
    },
    [insertCellAt],
  );

  const createMarkdownCell = useCallback(
    (idx: number, attrs?: Partial<MarkdownCellType>) => {
      const cell = buildMarkdownCell(attrs);
      insertCellAt(cell, idx);
      return cell;
    },
    [insertCellAt],
  );

  const hasOutput = useCallback(
    (id: string, type?: 'stdout' | 'stderr') => {
      const output = _output[id] || [];
      const length = type ? output.filter((o) => o.type === type).length : output.length;
      return length > 0;
    },
    [_output],
  );

  const getOutput = useCallback(
    (id: string, type?: 'stdout' | 'stderr') => {
      const output = _output[id] || [];
      return type ? output.filter((o) => o.type === type) : output;
    },
    [_output],
  );

  const setOutput = useCallback((id: string, output: OutputType | OutputType[]) => {
    output = Array.isArray(output) ? output : [output];
    internalSetOutput({
      ...outputRef.current,
      [id]: (outputRef.current[id] || []).concat(output),
    });
  }, []);

  const clearOutput = useCallback((id: string) => {
    internalSetOutput({ ...outputRef.current, [id]: [] });
  }, []);

  return (
    <CellsContext.Provider
      value={{
        cells,
        setCells,
        updateCell,
        removeCell,
        insertCellAt,
        createCodeCell,
        createMarkdownCell,
        hasOutput,
        getOutput,
        setOutput,
        clearOutput,
      }}
    >
      {children}
    </CellsContext.Provider>
  );
};

export const useCells = (): CellsContextType => {
  const context = useContext(CellsContext);
  if (context === undefined) {
    throw new Error('useCells must be used within a CellsProvider');
  }
  return context;
};
