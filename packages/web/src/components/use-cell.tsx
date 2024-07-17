import { createContext, useCallback, useContext, ReactNode, useRef, useReducer } from 'react';
import {
  CellType,
  CodeCellType,
  CodeLanguageType,
  MarkdownCellType,
  TsServerDiagnosticType,
  getDefaultExtensionForLanguage,
} from '@srcbook/shared';
import { GenerateAICellType, OutputType } from '@/types';

import { randomid } from '@srcbook/shared';

type ClientCellType = CellType | GenerateAICellType;

/**
 * Utility function to generate a unique filename for a code cell,
 * given the list of existing filenames.
 */
function generateUniqueFilename(existingFilenames: string[], language: CodeLanguageType): string {
  const baseName = 'untitled';
  const extension = getDefaultExtensionForLanguage(language);

  let filename = `${baseName}${extension}`;
  let counter = 1;

  while (existingFilenames.includes(filename)) {
    filename = `${baseName}${counter}${extension}`;
    counter++;
  }

  return filename;
}

function buildGenerateAiCell(): GenerateAICellType {
  return {
    id: randomid(),
    type: 'generate-ai',
  };
}

function buildCodeCell(
  cells: ClientCellType[],
  language: CodeLanguageType,
  attrs: Partial<CodeCellType> = {},
): CodeCellType {
  const filenames = cells.filter((c) => c.type === 'code').map((c) => (c as CodeCellType).filename);
  const uniqueFilename = generateUniqueFilename(filenames, language);

  return {
    source: '',
    filename: uniqueFilename,
    status: 'idle',
    ...attrs,
    id: randomid(),
    type: 'code',
    language,
  };
}

function buildMarkdownCell(attrs: Partial<MarkdownCellType> = {}): MarkdownCellType {
  return {
    text: '',
    ...attrs,
    id: randomid(),
    type: 'markdown',
  };
}

type OutputStateType = Record<string, OutputType[]>;
type TsServerStateType = Record<string, TsServerDiagnosticType[]>;

interface CellsContextType {
  cells: ClientCellType[];
  setCells: (cells: ClientCellType[]) => void;
  updateCell: (cell: ClientCellType) => void;
  removeCell: (cell: ClientCellType) => void;
  insertCellAt: (cell: ClientCellType, idx: number) => void;
  createCodeCell: (
    idx: number,
    language: CodeLanguageType,
    attrs?: Partial<CodeCellType>,
  ) => CodeCellType;
  createMarkdownCell: (idx: number, attrs?: Partial<MarkdownCellType>) => MarkdownCellType;
  createGenerateAiCell: (idx: number) => GenerateAICellType;
  hasOutput: (id: string, type?: 'stdout' | 'stderr') => boolean;
  getOutput: (id: string, type?: 'stdout' | 'stderr') => Array<OutputType>;
  setOutput: (id: string, output: OutputType | OutputType[]) => void;
  clearOutput: (id: string, type?: 'stdout' | 'stderr') => void;
  getTsServerDiagnostics: (id: string) => TsServerDiagnosticType[];
  setTsServerDiagnostics: (id: string, diagnostics: TsServerDiagnosticType[]) => void;
}

const CellsContext = createContext<CellsContextType | undefined>(undefined);

export const CellsProvider: React.FC<{ initialCells: ClientCellType[]; children: ReactNode }> = ({
  initialCells,
  children,
}) => {
  // Use ref to help avoid stale state bugs in closures.
  const cellsRef = useRef<ClientCellType[]>(initialCells);

  // Use ref to help avoid stale state bugs in closures.
  const outputRef = useRef<OutputStateType>({});

  // Use ref to help avoid stale state bugs in closures.
  const tsServerDiagnosticsRef = useRef<TsServerStateType>({});

  // Because we use refs for our state, we need a way to trigger
  // component re-renders when the ref state changes.
  //
  // https://legacy.reactjs.org/docs/hooks-faq.html#is-there-something-like-forceupdate
  //
  const [, forceComponentRerender] = useReducer((x) => x + 1, 0);

  const stableSetCells = useCallback((cells: ClientCellType[]) => {
    cellsRef.current = cells;
    forceComponentRerender();
  }, []);

  const stableSetOutput = useCallback((output: OutputStateType) => {
    outputRef.current = output;
    forceComponentRerender();
  }, []);

  const stableSetTsServerDiagnostics = useCallback((diagnostics: TsServerStateType) => {
    tsServerDiagnosticsRef.current = diagnostics;
    forceComponentRerender();
  }, []);

  const updateCell = useCallback(
    (cell: ClientCellType) => {
      stableSetCells(cellsRef.current.map((c) => (c.id === cell.id ? cell : c)));
    },
    [stableSetCells],
  );

  const removeCell = useCallback(
    (cell: ClientCellType) => {
      stableSetCells(cellsRef.current.filter((c) => c.id !== cell.id));
    },
    [stableSetCells],
  );

  const insertCellAt = useCallback(
    (cell: ClientCellType, idx: number) => {
      const copy = [...cellsRef.current];
      copy.splice(idx, 0, cell);
      stableSetCells(copy);
    },
    [stableSetCells],
  );

  const createCodeCell = useCallback(
    (idx: number, language: CodeLanguageType, attrs?: Partial<CodeCellType>) => {
      const cell = buildCodeCell(cellsRef.current, language, attrs);
      insertCellAt(cell, idx);
      return cell;
    },
    [insertCellAt],
  );

  const createGenerateAiCell = useCallback(
    (idx: number) => {
      const cell = buildGenerateAiCell();
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

  const hasOutput = useCallback((id: string, type?: 'stdout' | 'stderr') => {
    const output = outputRef.current[id] || [];
    const length = type ? output.filter((o) => o.type === type).length : output.length;
    return length > 0;
  }, []);

  const getOutput = useCallback((id: string, type?: 'stdout' | 'stderr') => {
    const output = outputRef.current[id] || [];
    return type ? output.filter((o) => o.type === type) : output;
  }, []);

  const setOutput = useCallback(
    (id: string, output: OutputType | OutputType[]) => {
      output = Array.isArray(output) ? output : [output];
      stableSetOutput({
        ...outputRef.current,
        [id]: (outputRef.current[id] || []).concat(output),
      });
    },
    [stableSetOutput],
  );

  const clearOutput = useCallback(
    (id: string, type?: 'stdout' | 'stderr') => {
      const output = outputRef.current[id] || [];
      const updated = type !== undefined ? output.filter((o) => o.type !== type) : [];
      stableSetOutput({ ...outputRef.current, [id]: updated });
    },
    [stableSetOutput],
  );

  const getTsServerDiagnostics = useCallback((id: string) => {
    return tsServerDiagnosticsRef.current[id] || [];
  }, []);

  const setTsServerDiagnostics = useCallback(
    (id: string, diagnostics: TsServerDiagnosticType[]) => {
      stableSetTsServerDiagnostics({ ...tsServerDiagnosticsRef.current, [id]: diagnostics });
    },
    [stableSetTsServerDiagnostics],
  );

  return (
    <CellsContext.Provider
      value={{
        cells: cellsRef.current,
        setCells: stableSetCells,
        updateCell,
        removeCell,
        insertCellAt,
        createCodeCell,
        createMarkdownCell,
        createGenerateAiCell,
        hasOutput,
        getOutput,
        setOutput,
        clearOutput,
        getTsServerDiagnostics,
        setTsServerDiagnostics,
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
