import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Plus, PlayCircle } from 'lucide-react';
import { exec, loadSession, createCell } from '@/lib/server';
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

  async function createNewCell() {
    const { result } = await createCell({ sessionId: session.id, type: 'code' });
    setCells(cells.concat(result));
  }

  return (
    <>
      <div className="space-y-6">
        {cells.map((cell) => (
          <Cell key={cell.id} cell={cell} onEvaluate={onEvaluate} />
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

function Cell(props: { cell: CellType; onEvaluate: (cell: CellType, source: string) => void }) {
  switch (props.cell.type) {
    case 'heading':
      return <HeadingCell cell={props.cell} />;
    case 'code':
      return <CodeCell onEvaluate={props.onEvaluate} cell={props.cell} />;
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
}) {
  const cell = props.cell;

  const [source, setSource] = useState(cell.source);

  const output = cell.output.find((o) => o.type === 'eval') as EvalOutputType | void;

  return (
    <div className="space-y-1.5">
      <button
        className="flex items-center gap-x-1.5"
        onClick={() => props.onEvaluate(cell, source)}
      >
        <PlayCircle size={16} />
        Evaluate
      </button>
      <textarea
        className="p-2 resize-none w-full border rounded font-mono text-sm"
        rows={4}
        onChange={(e) => setSource(e.target.value)}
        value={source}
        onKeyDown={(e) => {
          if (e.metaKey && e.key === 'Enter') {
            props.onEvaluate(cell, source);
          }
        }}
      ></textarea>
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
