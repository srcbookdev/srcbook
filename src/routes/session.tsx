import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Plus, PlayCircle } from 'lucide-react';
import { exec, loadSession, createCell, updateCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import type { CellType, CodeCellType, EvalOutputType, HeadingCellType } from '@/types';

export async function loader({ params }: any) {
  const { result: session } = await loadSession({ id: params.id });
  return { session };
}

export default function Session() {
  const { session } = useLoaderData() as any;

  const [cells, setCells] = useState<CellType[]>(session.cells);

  function updateCells(updatedCell: CellType) {
    const updatedCells = cells.map((cell) => (cell.id === updatedCell.id ? updatedCell : cell));
    setCells(updatedCells);
  }

  async function onEvaluate(cell: CellType, source: string) {
    const { result: updatedCell } = await exec(session.id, { cellId: cell.id, source });
    updateCells(updatedCell);
  }

  async function onUpdateCell(cell: CellType, attrs: Record<string, any>) {
    const { result: updatedCell } = await updateCell({
      sessionId: session.id,
      cellId: cell.id,
      ...attrs,
    });

    updateCells(updatedCell);
  }

  async function createNewCell() {
    const { result } = await createCell({ sessionId: session.id, type: 'code' });
    setCells(cells.concat(result));
  }

  return (
    <>
      <div className="space-y-6">
        {cells.map((cell) => (
          <Cell key={cell.id} cell={cell} onEvaluate={onEvaluate} onUpdateCell={onUpdateCell} />
        ))}
        <div className="py-3 flex justify-center">
          <button
            className="p-2 border rounded-full hover:bg-foreground hover:text-background hover:border-background transition-colors"
            onClick={createNewCell}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </>
  );
}

function Cell(props: {
  cell: CellType;
  onEvaluate: (cell: CellType, source: string) => void;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  switch (props.cell.type) {
    case 'heading':
      return <HeadingCell cell={props.cell} />;
    case 'code':
      return (
        <CodeCell
          cell={props.cell}
          onEvaluate={props.onEvaluate}
          onUpdateCell={props.onUpdateCell}
        />
      );
    default:
      throw new Error('Unrecognized cell type');
  }
}

function HeadingCell(props: { cell: HeadingCellType }) {
  const { depth, text } = props.cell;

  switch (depth) {
    case 1:
      return (
        <div>
          <h1 className="text-2xl">{text}</h1>
        </div>
      );
    case 2:
      return (
        <div>
          <h2 className="text-xl">{text}</h2>
        </div>
      );
  }
}

function CodeCell(props: {
  cell: CodeCellType;
  onEvaluate: (cell: CellType, source: string) => void;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  const cell = props.cell;
  const output = cell.output.find((o) => o.type === 'eval') as EvalOutputType | void;

  const [source, setSource] = useState(cell.source);

  function onChange(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  return (
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-x-1.5"
        onClick={() => props.onEvaluate(cell, source)}
      >
        <PlayCircle size={16} />
        Evaluate
      </button>
      <CodeMirror value={source} height="200px" extensions={[javascript()]} onChange={onChange} />
      {output !== undefined && (
        <div
          className={cn(
            'border rounded mt-2 p-2 font-mono whitespace-pre-wrap text-sm',
            output.error && 'text-red-600',
          )}
        >
          {output.text}
        </div>
      )}
    </div>
  );
}
