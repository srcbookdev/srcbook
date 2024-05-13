import { useRef, useState } from 'react';
import { useLoaderData } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Plus, PlayCircle } from 'lucide-react';
import { exec, loadSession, createCell, updateCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import type {
  CellType,
  CodeCellType,
  EvalOutputType,
  TitleCellType,
  HeadingCellType,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1, EditableH2 } from '@/components/ui/heading';

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
    </>
  );
}

function Cell(props: {
  cell: CellType;
  onEvaluate: (cell: CellType, source: string) => void;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  switch (props.cell.type) {
    case 'title':
      return <TitleCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    case 'heading':
      return <HeadingCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
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

function TitleCell(props: {
  cell: TitleCellType;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  return (
    <div className="mt-4 mb-10">
      <EditableH1
        text={props.cell.text}
        className="text-3xl font-semibold"
        onUpdated={(text) => props.onUpdateCell(props.cell, { text })}
      />
    </div>
  );
}

function HeadingCell(props: {
  cell: HeadingCellType;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  return (
    <div className="mb-4">
      <EditableH2
        text={props.cell.text}
        className="text-2xl font-semibold"
        onUpdated={(text) => props.onUpdateCell(props.cell, { text })}
      />
    </div>
  );
}

function CodeCell(props: {
  cell: CodeCellType;
  onEvaluate: (cell: CellType, source: string) => void;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  const cell = props.cell;
  const output = cell.output.find((o) => o.type === 'eval') as EvalOutputType | void;

  const [source, setSource] = useState(cell.source);

  function onChangeSource(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="space-y-1.5 mb-14">
      <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
        <div className="px-1.5 py-2 border-b flex items-center justify-between gap-2">
          <div className="font-bold">
            <Input
              ref={inputRef}
              required
              defaultValue={cell.filename}
              onBlur={() => {
                if (!inputRef.current) return;
                const filename = inputRef.current.value;
                if (filename !== cell.filename) {
                  props.onUpdateCell(cell, { filename });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && inputRef.current) {
                  inputRef.current.blur();
                }
              }}
              className="font-mono font-semibold text-xs border-transparent hover:border-input transition-colors"
            />
          </div>
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button onClick={() => props.onEvaluate(cell, source)}>
              <PlayCircle size={16} className="mr-2" />
              Evaluate
            </Button>
          </div>
        </div>
        <CodeMirror
          value={source}
          height="200px"
          extensions={[javascript()]}
          onChange={onChangeSource}
        />
      </div>
      {output !== undefined && (
        <div
          className={cn(
            'border rounded mt-2 p-2 font-mono whitespace-pre-wrap text-sm bg-input/10',
            output.error && 'text-red-600',
          )}
        >
          {output.text}
        </div>
      )}
    </div>
  );
}
