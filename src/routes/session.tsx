import { useRef, useState } from 'react';
import Markdown from 'marked-react';
import { useLoaderData } from 'react-router-dom';
import CodeMirror from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { markdown } from '@codemirror/lang-markdown';
import { PlayCircle, Trash2, Pencil } from 'lucide-react';
import { exec, loadSession, createCell, updateCell, deleteCell } from '@/lib/server';
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
import NewCellPopover from '@/components/new-cell-popover';

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

  async function onDeleteCell(cell: CellType) {
    if (cell.type === 'title') {
      throw new Error('Cannot delete title cell');
    }
    const response = await deleteCell({ sessionId: session.id, cellId: cell.id });
    if ('error' in response) {
      console.error('Failed to delete cell');
      return;
    }
    if ('result' in response) {
      const { result: updatedCells } = response;
      setCells(updatedCells);
    }
  }

  function updateCells(updatedCell: CellType) {
    const updatedCells = cells.map((cell) => (cell.id === updatedCell.id ? updatedCell : cell));
    setCells(updatedCells);
  }

  async function onEvaluate(cell: CellType, source: string) {
    const { result: updatedCell } = await exec(session.id, { cellId: cell.id, source });
    updateCells(updatedCell);
  }

  async function onUpdateCell<T extends CellType>(cell: T, attrs: Partial<T>) {
    const { result: updatedCell } = await updateCell({
      sessionId: session.id,
      cellId: cell.id,
      ...attrs,
    });

    updateCells(updatedCell);
  }

  async function createNewCell(type: 'code' | 'markdown' = 'code') {
    const { result } = await createCell({ sessionId: session.id, type });
    setCells(cells.concat(result));
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        {cells.map((cell) => (
          <Cell
            key={cell.id}
            cell={cell}
            onEvaluate={onEvaluate}
            onUpdateCell={onUpdateCell}
            onDeleteCell={onDeleteCell}
          />
        ))}
      </div>

      <div className="py-3 flex justify-center">
        <NewCellPopover createNewCell={createNewCell} />
      </div>
    </>
  );
}

function Cell(props: {
  cell: CellType;
  onEvaluate: (cell: CellType, source: string) => Promise<void>;
  onUpdateCell: <T extends CellType>(cell: T, attrs: Partial<T>) => Promise<void>;
  onDeleteCell: (cell: CellType) => void;
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
          onDeleteCell={props.onDeleteCell}
        />
      );
    case 'markdown':
      return (
        <MarkdownCell
          cell={props.cell}
          onUpdateCell={props.onUpdateCell}
          onDeleteCell={props.onDeleteCell}
        />
      );
    default:
      throw new Error('Unrecognized cell type');
  }
}

function TitleCell(props: {
  cell: TitleCellType;
  onUpdateCell: (cell: TitleCellType, attrs: Partial<TitleCellType>) => Promise<void>;
}) {
  return (
    <div className="mt-4">
      <EditableH1
        text={props.cell.text}
        className="text-4xl font-bold"
        onUpdated={(text) => props.onUpdateCell(props.cell, { text })}
      />
    </div>
  );
}

function MarkdownCell(props: {
  cell: MarkdownCellType;
  onUpdateCell: (cell: MarkdownCellType, attrs: Partial<MarkdownCellType>) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const [status, setStatus] = useState<'edit' | 'view'>('view');
  const [text, setText] = useState(props.cell.text);
  const cell = props.cell;

  function onChangeSource(source: string) {
    setText(source);
  }

  function onSave() {
    props.onUpdateCell(cell, { text });
  }

  return (
    <div
      onDoubleClick={() => setStatus('edit')}
      className="group/cell relative w-full border border-transparent p-4 hover:border-gray-200 rounded-sm"
    >
      {status === 'view' ? (
        <div className="prose prose-p:my-0 prose-li:my-0 max-w-full">
          <Markdown>{text}</Markdown>
          <div className="absolute bottom-1 right-1 hidden group-hover/cell:flex group-focus-within/cell:flex items-center gap-2">
            <Button variant="ghost" onClick={() => setStatus('edit')}>
              <Pencil size={16} />
            </Button>
            <Button variant="ghost" onClick={() => props.onDeleteCell(cell)}>
              <Trash2 size={16} />
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={() => setStatus('view')}>
                Cancel
              </Button>
              <Button
                onClick={() => {
                  onSave();
                  setStatus('view');
                }}
              >
                Save
              </Button>
            </div>
            <Button variant="destructive" onClick={() => props.onDeleteCell(cell)}>
              Delete
            </Button>
          </div>

          <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
            <CodeMirror
              value={text}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
              extensions={[markdown()]}
              onChange={onChangeSource}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function CodeCell(props: {
  cell: CodeCellType;
  onEvaluate: (cell: CellType, source: string) => Promise<void>;
  onUpdateCell: (cell: CodeCellType, attrs: Partial<CodeCellType>) => Promise<void>;
  onDeleteCell: (cell: CellType) => void;
}) {
  const cell = props.cell;

  const [source, setSource] = useState(cell.source);

  function onChangeSource(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  return (
    <div className="relative group/cell space-y-1.5">
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
        <div className="relative">
          <CodeMirror value={source} extensions={[javascript()]} onChange={onChangeSource} />
          <Button
            variant="ghost"
            className="absolute bottom-1 right-1 hidden group-hover/cell:flex group-focus-within/cell:flex"
            onClick={() => props.onDeleteCell(cell)}
          >
            <Trash2 size={16} />
          </Button>
        </div>
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
