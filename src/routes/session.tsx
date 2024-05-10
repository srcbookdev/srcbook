import { useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import { Plus, PlayCircle } from 'lucide-react';
import { exec, loadSession, createCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import type { CellType, SectionCellType } from '@/types';

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

  async function onEvaluate(cell: CellType, code: string) {
    const { result: updatedCell } = await exec(session.id, { cellId: cell.id, code });
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

type CellPropsType = { cell: CellType; onEvaluate: (cell: CellType, code: string) => void };

function Cell(props: CellPropsType) {
  switch (props.cell.type) {
    case 'section':
      return <SectionCell cell={props.cell} />;
    case 'code':
      return <CodeCell onEvaluate={props.onEvaluate} cell={props.cell} />;
    default:
      throw new Error('Unrecognized cell type');
  }
}

function SectionCell(props: { cell: SectionCellType }) {
  const { depth, text } = props.cell.input;

  switch (depth) {
    case 1:
      return (
        <div>
          <h1 className="text-3xl">{text}</h1>
        </div>
      );
    case 2:
      return (
        <div>
          <h2 className="text-2xl">{text}</h2>
        </div>
      );
    case 3:
      return (
        <div>
          <h3 className="text-xl">{text}</h3>
        </div>
      );
    default:
      return (
        <div>
          <h4 className="text-lg">{text}</h4>
        </div>
      );
  }
}

function CodeCell(props: CellPropsType) {
  const cell = props.cell;

  const [code, setCode] = useState(cell.input.text);

  return (
    <div className="space-y-1.5">
      <button className="flex items-center gap-x-1.5" onClick={() => props.onEvaluate(cell, code)}>
        <PlayCircle size={16} />
        Evaluate
      </button>
      <textarea
        className="p-2 resize-none w-full border rounded font-mono text-sm"
        rows={4}
        onChange={(e) => setCode(e.target.value)}
        value={code}
        onKeyDown={(e) => {
          if (e.metaKey && e.key === 'Enter') {
            props.onEvaluate(cell, code);
          }
        }}
      ></textarea>
      {cell.output && (
        <div
          className={cn(
            'border rounded mt-2 p-2 font-mono whitespace-pre-wrap text-sm',
            cell.output.error && 'text-red-600',
          )}
        >
          {cell.output.result}
        </div>
      )}
    </div>
  );
}
