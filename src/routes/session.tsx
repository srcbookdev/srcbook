import { useRef, useState } from 'react';
import Markdown from 'marked-react';
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
  OutputType,
  TitleCellType,
  MarkdownCellType,
} from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1 } from '@/components/ui/heading';

type SlimSessionType = {
  id: string;
  cells: CellType[];
};

export async function loader({ params }: { params: { id: string } }) {
  const { result: session } = await loadSession({ id: params.id });
  return { session };
}

export default function Session() {
  const { session } = useLoaderData() as { session: SlimSessionType };

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
  onEvaluate: (cell: CellType, source: string) => Promise<void>;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => Promise<void>;
}) {
  switch (props.cell.type) {
    case 'title':
      return <TitleCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    case 'code':
      return (
        <CodeCell
          cell={props.cell}
          onEvaluate={props.onEvaluate}
          onUpdateCell={props.onUpdateCell}
        />
      );
    case 'markdown':
      return <MarkdownCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    default:
      throw new Error('Unrecognized cell type');
  }
}

function TitleCell(props: {
  cell: TitleCellType;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => Promise<void>;
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

function MarkdownCell(props: {
  cell: MarkdownCellType;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => void;
}) {
  return (
    <div className="mt-4 mb-10 prose">
      <Markdown>{props.cell.rawText}</Markdown>
    </div>
  );
}

function CodeCell(props: {
  cell: CodeCellType;
  onEvaluate: (cell: CellType, source: string) => Promise<void>;
  onUpdateCell: (cell: CellType, attrs: Record<string, any>) => Promise<void>;
}) {
  const cell = props.cell;

  const [source, setSource] = useState(cell.source);

  function onChangeSource(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  return (
    <div className="space-y-1.5 mb-14">
      <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
        <div className="px-1.5 py-2 border-b flex items-center justify-between gap-2">
          <FilenameInput
            filename={cell.filename}
            onUpdate={(filename) => props.onUpdateCell(cell, { filename })}
          />
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity">
            <Button onClick={() => props.onEvaluate(cell, source)}>
              <PlayCircle size={16} className="mr-2" />
              Run
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
      <CellOutput output={cell.output} />
    </div>
  );
}

function CellOutput(props: { output: OutputType[] }) {
  if (props.output.length === 0) {
    return null;
  }

  const output = props.output.filter((o) => o.type !== 'eval').map(({ text }) => text);
  const result = props.output.find((o) => o.type === 'eval') as EvalOutputType | void;

  return (
    <div className="border rounded mt-2 font-mono text-sm bg-input/10 divide-y">
      {output.length > 0 && <div className="p-2 whitespace-pre-wrap">{output.join('\n')}</div>}
      {result !== undefined && (
        <div className={cn('p-2 whitespace-pre-wrap', result.error && 'text-red-600')}>
          {result.text}
        </div>
      )}
    </div>
  );
}

function FilenameInput(props: { filename: string; onUpdate: (filename: string) => Promise<void> }) {
  const filename = props.filename;
  const onUpdate = props.onUpdate;

  const [error, setError] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <div className="font-bold">
      <Input
        ref={inputRef}
        required
        defaultValue={filename}
        onBlur={() => {
          if (!inputRef.current) {
            return;
          }

          const updatedFilename = inputRef.current.value;
          if (updatedFilename !== filename) {
            onUpdate(updatedFilename).catch((e) => {
              if (inputRef.current) {
                inputRef.current.value = filename;
              }
              setError(e.message);
              setTimeout(() => setError(null), 1500);
            });
          }
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && inputRef.current) {
            inputRef.current.blur();
          }
        }}
        className={cn(
          'font-mono font-semibold text-xs border-transparent hover:border-input transition-colors',
          error && 'border border-red-600 hover:border-red-600 focus-visible:ring-red-600',
        )}
      />
    </div>
  );
}
