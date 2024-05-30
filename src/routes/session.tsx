import { useEffect, useRef, useState } from 'react';
import { Prec } from '@codemirror/state';
import { githubLight } from '@uiw/codemirror-theme-github';
import Markdown from 'marked-react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror from '@uiw/react-codemirror';
import { keymap } from '@codemirror/view';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import {
  Loader2,
  StopCircle,
  Plus,
  PlayCircle,
  Trash2,
  Pencil,
  ChevronRight,
  Save,
} from 'lucide-react';
import { loadSession, createCell, updateCell as updateCellServer, deleteCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import SaveModal from '@/components/save-modal-dialog';
import type {
  CellType,
  CodeCellType,
  PackageJsonCellType,
  TitleCellType,
  MarkdownCellType,
  SessionType,
  OutputType,
} from '@/types';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1 } from '@/components/ui/heading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NewCellPopover from '@/components/new-cell-popover';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import InstallPackageModal from '@/components/install-package-modal';
import SessionClient, { type Message } from '@/clients/session';
import { CellsProvider, useCells } from '@/components/use-cell';

async function loader({ params }: LoaderFunctionArgs) {
  const { result: session } = await loadSession({ id: params.id! });
  return { session, client: new SessionClient(params.id!) };
}

function SessionPage() {
  const { session, client } = useLoaderData() as { session: SessionType; client: SessionClient };

  return (
    <CellsProvider initialCells={session.cells}>
      <Session session={session} client={client} />
    </CellsProvider>
  );
}

function Session(props: { session: SessionType; client: SessionClient }) {
  const { session, client } = props;

  const { cells, setCells, updateCell, removeCell, createCodeCell, createMarkdownCell, setOutput } =
    useCells();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSave, setShowSave] = useState(false);
  // The key '?' is buggy, so we use 'Slash' with 'shift' modifier.
  // This assumes qwerty layout.
  useHotkeys('shift+Slash', () => setShowShortcuts(!showShortcuts));

  async function onDeleteCell(cell: CellType) {
    if (cell.type === 'title') {
      throw new Error('Cannot delete title cell');
    }

    // Optimistically delete cell
    removeCell(cell);

    const response = await deleteCell({ sessionId: session.id, cellId: cell.id });
    if ('error' in response) {
      // Undo optimistic cell deletion
      setCells(cells);
      console.error('Failed to delete cell', response);
    }
  }

  useEffect(() => {
    const callback = (message: Message) => setOutput(message.cellId, message.output);

    client.on('cell:output', callback);

    return () => client.off('cell:output', callback);
  }, [client, setOutput]);

  useEffect(() => {
    const callback = (message: Message) => {
      updateCell(message.cell);
    };

    client.on('cell:updated', callback);

    return () => client.off('cell:updated', callback);
  }, [client, updateCell]);

  async function onUpdateCell<T extends CellType>(cell: T, attrs: Partial<T>) {
    // Optimistic cell update
    updateCell({ ...cell, ...attrs });

    const response = await updateCellServer({
      sessionId: session.id,
      cellId: cell.id,
      ...attrs,
    });

    if (response.error) {
      // Undo optimistic cell update
      setCells(cells);
      console.error('Failed to update cell', response);
    }
  }

  async function createNewCell(type: 'code' | 'markdown', index: number) {
    // Create on client
    const cell = type === 'code' ? createCodeCell(index) : createMarkdownCell(index);

    const response = await createCell({ sessionId: session.id, cell, index });

    if (response.error) {
      // Undo client cell creation
      setCells(cells);
      console.error('Failed to update cell', response);
    }
  }

  return (
    <div>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <SaveModal open={showSave} onOpenChange={setShowSave} session={session} />

      <div className="fixed bottom-2 right-2">
        <div className="flex flex-col items-center gap-1">
          <div
            className="font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
            onClick={() => setShowSave(!showSave)}
          >
            <Save size={16} />
          </div>
          <div
            className="font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
            onClick={() => setShowShortcuts(!showShortcuts)}
          >
            ?
          </div>
        </div>
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
              session={session}
              client={client}
              onUpdateCell={onUpdateCell}
              onDeleteCell={onDeleteCell}
            />
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <NewCellPopover createNewCell={(type) => createNewCell(type, cells.length)}>
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
  session: SessionType;
  client: SessionClient;
  onUpdateCell: <T extends CellType>(cell: T, attrs: Partial<T>) => Promise<void>;
  onDeleteCell: (cell: CellType) => void;
}) {
  switch (props.cell.type) {
    case 'title':
      return <TitleCell cell={props.cell} onUpdateCell={props.onUpdateCell} />;
    case 'code':
      return (
        <CodeCell
          session={props.session}
          cell={props.cell}
          client={props.client}
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
      return (
        <PackageJsonCell
          session={props.session}
          client={props.client}
          cell={props.cell}
          onUpdateCell={props.onUpdateCell}
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
        <div className="prose prose-p:my-0 max-w-full prose-inline-code:rounded prose-inline-code:bg-gray-100 prose-inline-code:border prose-inline-code: border-gray-200 prose-inline-code:px-1">
          <Markdown>{text}</Markdown>
          <div className="absolute top-1 right-1 hidden group-hover/cell:flex group-focus-within/cell:flex items-center gap-0.5 border border-gray-200 rounded-sm px-1 py-0.5 bg-background z-10">
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
              theme={githubLight}
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
  client: SessionClient;
  session: SessionType;
  onUpdateCell: (cell: PackageJsonCellType, attrs: Partial<PackageJsonCellType>) => Promise<void>;
}) {
  const { cell, client, session, onUpdateCell } = props;

  const [status, setStatus] = useState<'running' | 'idle'>('idle');
  const [open, setOpen] = useState(false);

  const { clearOutput } = useCells();

  const onOpenChange = (state: boolean) => {
    // Clear the output when we collapse the package.json cell.
    if (!state) {
      clearOutput(cell.id);
    }
    setOpen(state);
  };

  useEffect(() => {
    const callback = (message: Message) => {
      if (message.cellId === cell.id) {
        setStatus('idle');
      }
    };
    client.on('cell:exited', callback);
    return () => client.off('cell:exited', callback);
  }, [client, cell]);

  const npmInstall = () => {
    setStatus('running');
    clearOutput(cell.id);
    client.send('cell:exec', {
      sessionId: session.id,
      cellId: cell.id,
      source: cell.source,
    });
  };

  function onChangeSource(source: string) {
    onUpdateCell(cell, { source });
  }

  function evaluateModEnter() {
    onUpdateCell(cell, { source: cell.source });
    return true;
  }

  return (
    <>
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div className="flex w-full justify-between items-center gap-2">
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
          <Button
            onClick={npmInstall}
            variant="outline"
            className={cn('transition-all', open ? 'opacity-100' : 'opacity-0')}
          >
            {status === 'running' && (
              <div className="flex items-center gap-2">
                <Loader2 className="animate-spin" size={16} /> running
              </div>
            )}
            {status === 'idle' && (
              <div className="flex items-center gap-2">
                <PlayCircle size={16} />
                Run
              </div>
            )}
          </Button>
          <InstallPackageModal client={client} session={session}>
            <Button
              variant="outline"
              className={cn('transition-all', open ? 'opacity-100' : 'opacity-0')}
            >
              Install package
            </Button>
          </InstallPackageModal>
        </div>
        <CollapsibleContent className="py-2">
          <div className="border rounded group outline-blue-100 focus-within:outline focus-within:outline-2">
            <CodeMirror
              value={cell.source.trim()}
              theme={githubLight}
              extensions={[
                json(),
                Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
              ]}
              onChange={onChangeSource}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
            />
          </div>
          <CellOutput cellId={cell.id} />
        </CollapsibleContent>
      </Collapsible>
    </>
  );
}
function CodeCell(props: {
  session: SessionType;
  cell: CodeCellType;
  client: SessionClient;
  onUpdateCell: (cell: CodeCellType, attrs: Partial<CodeCellType>) => Promise<void>;
  onDeleteCell: (cell: CellType) => void;
}) {
  const cell = props.cell;
  const [status, setStatus] = useState<'running' | 'idle'>('idle');
  const [source, setSource] = useState(cell.source);

  const { clearOutput } = useCells();

  // Subscribe to the websocket event to update the state back to idle.
  useEffect(() => {
    const callback = (message: Message) => {
      if (message.cellId === props.cell.id) {
        setStatus('idle');
      }
    };
    props.client.on('cell:exited', callback);
    return () => props.client.off('cell:exited', callback);
  }, [props.client, props.cell.id]);

  function onChangeSource(source: string) {
    setSource(source);
    props.onUpdateCell(cell, { source });
  }

  function evaluateModEnter() {
    runCell();
    return true;
  }

  function runCell() {
    setStatus('running');
    clearOutput(cell.id);
    props.client.send('cell:exec', { sessionId: props.session.id, cellId: cell.id, source });
  }

  function stopCell() {
    props.client.send('cell:stop', { sessionId: props.session.id, cellId: cell.id });
  }

  return (
    <div className="relative group/cell space-y-1.5">
      <div
        className={cn(
          'border rounded group',
          status === 'running'
            ? 'outline-orange-100 outline outline-2'
            : 'outline-blue-100 focus-within:outline focus-within:outline-2',
        )}
      >
        <div className="px-1.5 py-2 border-b flex items-center justify-between gap-2">
          <FilenameInput
            filename={cell.filename}
            onUpdate={(filename) => props.onUpdateCell(cell, { filename })}
          />
          <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-2">
            <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
              <Button variant="ghost" tabIndex={1}>
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
            {status === 'running' && (
              <Button variant="outline" onClick={stopCell} tabIndex={1}>
                <div className="flex items-center gap-2">
                  <StopCircle size={16} /> Stop
                </div>
              </Button>
            )}
            {status === 'idle' && (
              <Button variant="outline" onClick={runCell} tabIndex={1}>
                <div className="flex items-center gap-2">
                  <PlayCircle size={16} />
                  Run
                </div>
              </Button>
            )}
          </div>
        </div>
        <CodeMirror
          value={source}
          theme={githubLight}
          extensions={[
            javascript(),
            Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
          ]}
          onChange={onChangeSource}
        />
      </div>
      <CellOutput cellId={cell.id} />
    </div>
  );
}

function formatOutput(output: OutputType[]) {
  return output.map(({ data }) => data).join('');
}

function CellOutput(props: { cellId: string }) {
  const { hasOutput, getOutput } = useCells();

  if (!hasOutput(props.cellId)) {
    return null;
  }

  const stdoutText = formatOutput(getOutput(props.cellId, 'stdout'));
  const stderrText = formatOutput(getOutput(props.cellId, 'stderr'));

  return (
    <div className="border rounded mt-2 font-mono text-sm bg-input/10 divide-y">
      {stdoutText && <div className="p-2 whitespace-pre-wrap overflow-scroll">{stdoutText}</div>}
      {stderrText && (
        <div className="p-2 whitespace-pre-wrap text-red-500 overflow-scroll">{stderrText}</div>
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

SessionPage.loader = loader;
export default SessionPage;
