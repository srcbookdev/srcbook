import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, PlayCircle } from 'lucide-react';
import { exec } from '@/lib/server';
import { cn, uuid } from '@/lib/utils';

type CellType = {
  id: string;
  contents: string;
  output: { error: boolean; result: string } | null;
};

function createCell(): CellType {
  return {
    id: uuid(),
    contents: '',
    output: null,
  };
}

export default function Session() {
  const { sessionId } = useParams();

  const [cells, setCells] = useState<CellType[]>([]);

  function updateCells(updatedCell: CellType) {
    const updatedCells = cells.map((cell) => (cell.id === updatedCell.id ? updatedCell : cell));
    setCells(updatedCells);
  }

  function onUpdateCell(id: string, contents: string) {
    const cell = cells.find((cell) => cell.id === id)!;
    updateCells({ ...cell, contents });
  }

  async function onEvaluate(cell: CellType) {
    const response = await exec({ sessionId: sessionId!, code: cell.contents });
    console.log(response);
    updateCells({ ...cell, output: response });
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="my-6">
        <h1 className="text-2xl">Session {sessionId}</h1>
      </div>
      <div className="space-y-6">
        {cells.map((cell) => (
          <Cell key={cell.id} cell={cell} onUpdateCell={onUpdateCell} onEvaluate={onEvaluate} />
        ))}
        <div className="py-3 flex justify-center">
          <button
            className="p-2 border rounded-full hover:bg-foreground hover:text-background hover:border-background transition-colors"
            onClick={() => {
              setCells(cells.concat(createCell()));
            }}
          >
            <Plus size={24} />
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell(props: {
  cell: CellType;
  onUpdateCell: (id: string, cell: string) => void;
  onEvaluate: (cell: CellType) => void;
}) {
  const cell = props.cell;

  function onChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    props.onUpdateCell(cell.id, e.target.value ?? '');
  }

  return (
    <div className="space-y-1.5">
      <button className="flex items-center gap-x-1.5" onClick={() => props.onEvaluate(cell)}>
        <PlayCircle size={16} />
        Evaluate
      </button>
      <textarea
        className="p-2 resize-none w-full border rounded font-mono text-sm"
        rows={4}
        onChange={onChange}
        value={cell.contents}
        onKeyDown={(e) => {
          if (e.metaKey && e.key === 'Enter') {
            props.onEvaluate(cell);
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
