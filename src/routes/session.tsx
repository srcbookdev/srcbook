import { useRef, useState } from 'react';
import { Prec } from '@codemirror/state';
import Markdown from 'marked-react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror from '@uiw/react-codemirror';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { Plus, PlayCircle, Trash2, Pencil, ChevronRight } from 'lucide-react';
import { exec, loadSession, createCell, updateCell, deleteCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import type {
  CellType,
  CodeCellType,
  EvalOutputType,
  OutputType,
  PackageJsonCellType,
  TitleCellType,
  MarkdownCellType,
} from '@/types';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1 } from '@/components/ui/heading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NewCellPopover from '@/components/new-cell-popover';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';

type SlimSessionType = {
  id: string;
  cells: CellType[];
};

async function loader({ params }: LoaderFunctionArgs) {
  const { result: session } = await loadSession({ id: params.id! });
  return { session };
}

function Session() {
  const { session } = useLoaderData() as { session: SlimSessionType };
  const [cells, setCells] = useState<CellType[]>(session.cells);
  const [showShortcuts, setShowShortcuts] = useState(false);
  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

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

  async function createNewCell(type: 'code' | 'markdown' = 'code', index?: number) {
    const { result } = await createCell({ sessionId: session.id, type, index });

    // Insert cell at the end if index is not provided
    if (!index) {
      setCells(cells.concat(result));
    } else {
      setCells(cells.slice(0, index).concat(result).concat(cells.slice(index)));
    }
  }

  return (
    <div>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <div
        className="fixed bottom-2 right-2 font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
        onClick={() => setShowShortcuts(!showShortcuts)}
      >
        ?
      </div>
      <div className="flex flex-col">
        {cells.map((cell, idx) => (
          <div key={`wrapper-${cell.id}`}>
            {idx > 1 && (
              <div className="flex justify-center w-full group">
                <NewCellPopover
                  createNewCell={(type) => {
                    return createNewCell(type, idx);
                  }}
                  key={`popover-${cell.id}`}
                >
                  <div className="m-1 p-0.5 border rounded-full border-transparent text-transparent group-hover:text-foreground hover:border-foreground transition-all active:translate-y-0.5">
                    <Plus size={16} />
                  </div>
                </NewCellPopover>
              </div>
            )}
            <Cell
              key={cell.id}
              cell={cell}
              onEvaluate={onEvaluate}
              onUpdateCell={onUpdateCell}
              onDeleteCell={onDeleteCell}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <NewCellPopover createNewCell={createNewCell}>
          <div className="m-4 p-2 border rounded-full hover:bg-foreground hover:text-background hover:border-background transition-all active:translate-y-0.5">
            <Plus size={24} />
          </div>
        </NewCellPopover>
      </div>
    </div>
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
    case 'package.json':
      return <PackageJsonCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    default:
      throw new Error('Unrecognized cell type');
  }
}

function TitleCell(props: {
  cell: TitleCellType;
  onUpdateCell: (cell: TitleCellType, attrs: Partial<TitleCellType>) => Promise<void>;
}) {
  return (
    <div className="my-4">
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

  const keyMap = Prec.highest(
    keymap.of([
      { key: 'Mod-Enter', run: onSave },
      {
        key: 'Escape',
        run: () => {
          setStatus('view');
          return true;
        },
      },
    ]),
  );

  function onChangeSource(source: string) {
    setText(source);
  }

  function onSave() {
    props.onUpdateCell(cell, { text });
    setStatus('view');
    return true;
  }

  return (
    <div
      onDoubleClick={() => setStatus('edit')}
      className="group/cell relative w-full border border-transparent p-4 hover:border-gray-200 rounded-sm transition-all"
    >
      {status === 'view' ? (
        <div className="prose prose-p:my-0 prose-li:my-0 max-w-full">
          <Markdown>{text}</Markdown>
          <div className="absolute top-1 right-1 hidden group-hover/cell:flex group-focus-within/cell:flex items-center gap-0.5 border border-gray-200 rounded-sm px-1 py-0.5 bg-background">
            <Button variant="ghost" onClick={() => setStatus('edit')}>
              <Pencil size={16} />
            </Button>

            <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
              <Button variant="ghost" size={'icon'}>
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="flex items-center justify-between pb-2">
            <div className="flex gap-2 items-center">
              <Button variant="outline" onClick={() => setStatus('view')}>
                Cancel
              </Button>
              <Button onClick={onSave}>Save</Button>
            </div>
            <Button variant="destructive" onClick={() => props.onDeleteCell(cell)}>
              Delete
            </Button>
          </div>

          <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
            <CodeMirror
              autoFocus
              indentWithTab={false}
              value={text}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
              extensions={[markdown(), keyMap]}
              onChange={onChangeSource}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PackageJsonCell(props: {
  cell: PackageJsonCellType;
  onUpdateCell: (cell: PackageJsonCellType, attrs: Partial<PackageJsonCellType>) => Promise<void>;
}) {
  const cell = props.cell;

  const [source, setSource] = useState(cell.source);
  const [open, setOpen] = useState(false);

  function onChangeSource(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  function evaluateModEnter() {
    props.onUpdateCell(cell, { source });
    return true;
  }

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <CollapsibleTrigger className="flex w-full gap-3" asChild>
        <div>
          <Button variant="ghost" className="font-mono font-semibold active:translate-y-0">
            package.json
            <ChevronRight
              size="24"
              style={{
                transform: open ? `rotate(90deg)` : 'none',
              }}
            />
          </Button>
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="py-2">
        <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
          <CodeMirror
            value={source}
            extensions={[
              json(),
              Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
            ]}
            onChange={onChangeSource}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
          />
        </div>
      </CollapsibleContent>
    </Collapsible>
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

  function evaluateModEnter() {
    props.onEvaluate(cell, source);
    return true;
  }

  return (
    <div className="relative group/cell space-y-1.5">
      <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
        <div className="px-1.5 py-2 border-b flex items-center justify-between gap-2">
          <FilenameInput
            filename={cell.filename}
            onUpdate={(filename) => props.onUpdateCell(cell, { filename })}
          />
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-2">
            <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
              <Button variant="ghost">
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
            <Button onClick={() => props.onEvaluate(cell, source)}>
              <PlayCircle size={16} className="mr-2" />
              Run
            </Button>
          </div>
        </div>
        <CodeMirror
          value={source}
          extensions={[
            javascript(),
            Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
          ]}
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
        autoFocus
        onFocus={(e) => {
          const input = e.target;
          const value = input.value;
          const dotIndex = value.lastIndexOf('.');
          if (dotIndex !== -1) {
            input.setSelectionRange(0, dotIndex);
          } else {
            input.select(); // In case there's no dot, select the whole value
          }
        }}
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

Session.loader = loader;
export default Session;
