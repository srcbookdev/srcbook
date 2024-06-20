import { useCallback, useEffect, useRef, useState } from 'react';
import Markdown from 'marked-react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { Circle, Plus, Play, Trash2, Pencil, ChevronRight, Save } from 'lucide-react';
import {
  CellType,
  CodeCellType,
  PackageJsonCellType,
  TitleCellType,
  MarkdownCellType,
  CellOutputPayloadType,
  CellUpdatedPayloadType,
  DepsValidateResponsePayloadType,
  CellUpdateAttrsType,
  TitleCellUpdateAttrsType,
  CodeCellUpdateAttrsType,
  PackageJsonCellUpdateAttrsType,
  MarkdownCellUpdateAttrsType,
  CellErrorPayloadType,
} from '@srcbook/shared';
import { loadSession, createCell, deleteCell } from '@/lib/server';
import { cn } from '@/lib/utils';
import { ExportSrcbookModal } from '@/components/import-export-srcbook-modal';
import { SessionType } from '@/types';
import KeyboardShortcutsDialog from '@/components/keyboard-shortcuts-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1 } from '@/components/ui/heading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import NewCellPopover from '@/components/new-cell-popover';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import DeleteSrcbookModal from '@/components/delete-srcbook-dialog';
import InstallPackageModal from '@/components/install-package-modal';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import { toast } from 'sonner';
import useEffectOnce from '@/components/use-effect-once';
import { CellStdio } from '@/components/cell-stdio';
import useTheme from '@/components/use-theme';

async function loader({ params }: LoaderFunctionArgs) {
  const { result: session } = await loadSession({ id: params.id! });
  return { session };
}

function SessionPage() {
  const { session } = useLoaderData() as { session: SessionType };

  const channelRef = useRef(SessionChannel.create(session.id));
  const channel = channelRef.current;

  useEffectOnce(() => {
    channel.subscribe();

    // TODO: Push once we know subscription succeeded
    channel.push('deps:validate', { sessionId: session.id });

    return () => channel.unsubscribe();
  });

  return (
    <CellsProvider initialCells={session.cells}>
      <Session session={session} channel={channelRef.current} />
    </CellsProvider>
  );
}

function Session(props: { session: SessionType; channel: SessionChannel }) {
  const { session, channel } = props;
  const { toggleTheme } = useTheme();

  const { cells, setCells, updateCell, removeCell, createCodeCell, createMarkdownCell, setOutput } =
    useCells();

  const [showShortcuts, setShowShortcuts] = useState(false);
  const [showSave, setShowSave] = useState(false);
  const [showDelete, setShowDelete] = useState(false);
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
    const callback = (payload: CellOutputPayloadType) => {
      setOutput(payload.cellId, payload.output);
    };

    channel.on('cell:output', callback);

    return () => channel.off('cell:output', callback);
  }, [channel, setOutput]);

  useEffect(() => {
    const callback = (payload: CellUpdatedPayloadType) => {
      updateCell(payload.cell);
    };

    channel.on('cell:updated', callback);

    return () => channel.off('cell:updated', callback);
  }, [channel, updateCell]);

  async function onUpdateCell<T extends CellType>(cell: T, updates: CellUpdateAttrsType) {
    updateCell({ ...cell, ...(updates as Partial<T>) });

    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
  }

  async function createNewCell(type: 'code' | 'markdown', index: number) {
    // Create on client
    const cell =
      type === 'code'
        ? createCodeCell(index, session.metadata.language)
        : createMarkdownCell(index);

    const response = await createCell({ sessionId: session.id, cell, index });

    if (response.error) {
      // Undo client cell creation
      setCells(cells);
      console.error('Failed to update cell', response);
    }
  }

  return (
    <div>
      <p
        className="fixed right-3 top-3 text-muted-foreground text-sm hover:cursor-pointer"
        onClick={toggleTheme}
      >
        toggle theme
      </p>
      <KeyboardShortcutsDialog open={showShortcuts} onOpenChange={setShowShortcuts} />
      <DeleteSrcbookModal open={showDelete} onOpenChange={setShowDelete} session={session} />
      <ExportSrcbookModal open={showSave} onOpenChange={setShowSave} session={session} />

      <div className="fixed bottom-3 right-3">
        <div className="flex flex-col items-center gap-1.5">
          <div
            className="font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
            onClick={() => setShowSave(!showSave)}
          >
            <Save size={16} />
          </div>
          <div
            className="font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
            onClick={() => setShowDelete(!showDelete)}
          >
            <Trash2 size={16} />
          </div>
          <div
            className="font-mono bg-gray-100 border border-gray-200 rounded-full shadow h-7 w-7 flex items-center justify-center hover:cursor-pointer text-gray-500 text-sm"
            onClick={() => setShowShortcuts(!showShortcuts)}
          >
            ?
          </div>
        </div>
      </div>
      <div>
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
              channel={channel}
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
  channel: SessionChannel;
  onUpdateCell: <T extends CellType>(cell: T, attrs: CellUpdateAttrsType) => Promise<void>;
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
          channel={props.channel}
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
          channel={props.channel}
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
  onUpdateCell: (cell: TitleCellType, attrs: TitleCellUpdateAttrsType) => Promise<void>;
}) {
  return (
    <div className="my-4">
      <EditableH1
        text={props.cell.text}
        className="title"
        onUpdated={(text) => props.onUpdateCell(props.cell, { text })}
      />
    </div>
  );
}

function MarkdownCell(props: {
  cell: MarkdownCellType;
  onUpdateCell: (cell: MarkdownCellType, attrs: MarkdownCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { codeTheme } = useTheme();
  const cell = props.cell;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);

  useEffect(() => {
    if (status === 'edit') {
      setText(cell.text);
    }
  }, [status, cell]);

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

  function onSave() {
    props.onUpdateCell(cell, { text });
    setStatus('view');
    return true;
  }

  return (
    <div
      onDoubleClick={() => setStatus('edit')}
      className={cn(
        'group/cell relative w-full pb-3 rounded-md hover:bg-input',
        status === 'edit' && 'bg-input ring-2 ring-ring',
        'transition-colors',
      )}
    >
      {status === 'view' ? (
        <div>
          <div className="p-1 w-full h-11 hidden group-hover/cell:flex items-center justify-between z-10">
            <h5 className="pl-2 text-sm font-mono font-bold">Markdown</h5>
            <div className="flex items-center gap-1">
              <Button
                variant="secondary"
                size="icon"
                className="border-transparent"
                onClick={() => setStatus('edit')}
              >
                <Pencil size={16} />
              </Button>

              <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
                <Button variant="secondary" size="icon" className="border-transparent">
                  <Trash2 size={16} />
                </Button>
              </DeleteCellWithConfirmation>
            </div>
          </div>
          <div className="sb-prose px-3 pt-11 group-hover/cell:pt-0">
            <Markdown>{cell.text}</Markdown>
          </div>
        </div>
      ) : (
        <div className="flex flex-col">
          <div className="p-1 w-full flex items-center justify-between z-10">
            <h5 className="pl-4 text-sm font-mono font-bold">Markdown</h5>
            <div className="flex items-center gap-1">
              <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
                <Button variant="secondary" size="icon">
                  <Trash2 size={16} />
                </Button>
              </DeleteCellWithConfirmation>

              <Button variant="secondary" onClick={() => setStatus('view')}>
                Cancel
              </Button>

              <Button onClick={onSave}>Save</Button>
            </div>
          </div>

          <div className="px-3 border rounded-sm">
            <CodeMirror
              theme={codeTheme}
              indentWithTab={false}
              value={text}
              basicSetup={{ lineNumbers: false, foldGutter: false }}
              extensions={[markdown(), keyMap]}
              onChange={(source) => setText(source)}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function PackageJsonCell(props: {
  cell: PackageJsonCellType;
  channel: SessionChannel;
  session: SessionType;
  onUpdateCell: (cell: PackageJsonCellType, attrs: PackageJsonCellUpdateAttrsType) => Promise<void>;
}) {
  const { cell, channel, session, onUpdateCell } = props;

  const [open, setOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [showStdio, setShowStdio] = useState(false);

  const { updateCell, clearOutput } = useCells();
  const { codeTheme } = useTheme();

  const npmInstall = useCallback(
    (packages?: Array<string>) => {
      setShowStdio(true);
      setOpen(true);
      // Here we use the client-only updateCell function. The server will know its running from the 'deps:install'.
      updateCell({ ...cell, status: 'running' });
      clearOutput(cell.id);

      channel.push('deps:install', {
        sessionId: session.id,
        packages: packages,
      });
    },
    [cell, clearOutput, channel, session, updateCell],
  );

  // Useeffect to handle single package install events
  useEffect(() => {
    const callback = (payload: DepsValidateResponsePayloadType) => {
      const { packages } = payload;
      const msg = packages
        ? `Missing dependencies: ${packages.join(', ')}`
        : 'Packages need to be installed';
      toast.warning(msg, {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => npmInstall(packages),
        },
      });
    };
    channel.on('deps:validate:response', callback);
    return () => channel.off('deps:validate:response', callback);
  }, [channel, npmInstall]);

  const onOpenChange = (state: boolean) => {
    // Clear the output when we collapse the package.json cell.
    if (!state) {
      setShowStdio(false);
    }
    setOpen(state);
  };

  function onChangeSource(source: string) {
    onUpdateCell(cell, { source });
  }

  function evaluateModEnter() {
    npmInstall();
    return true;
  }

  return (
    <>
      <InstallPackageModal
        channel={channel}
        session={session}
        open={installModalOpen}
        setOpen={setInstallModalOpen}
      />
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div
          className={
            open
              ? cn(
                'border rounded-md group',
                cell.status === 'running'
                  ? 'ring ring-2 ring-run-ring border-run-ring'
                  : 'focus-within:ring focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
              )
              : ''
          }
        >
          <div className="flex w-full justify-between items-start p-1">
            <CollapsibleTrigger className="flex gap-3" asChild>
              <div>
                <Button
                  variant="ghost"
                  className={cn(
                    'font-mono font-semibold active:translate-y-0 flex items-center gap-2',
                    open ? 'hover:border-transparent' : '',
                  )}
                  size="lg"
                >
                  <p>package.json</p>
                  <ChevronRight
                    size="24"
                    style={{
                      transform: open ? `rotate(90deg)` : 'none',
                      transition: 'transform 0.2s',
                      color: 'hsl(var(--tertiary-foreground))',
                    }}
                  />
                </Button>
              </div>
            </CollapsibleTrigger>

            {open && (
              <div className="flex items-center gap-2">
                <Button variant="secondary" onClick={() => setInstallModalOpen(true)}>
                  Install package
                </Button>
                <Button
                  size="default-with-icon"
                  onClick={() => npmInstall()}
                  disabled={cell.status !== 'idle'}
                  className="font-mono"
                >
                  <Play size={16} />
                  Run
                </Button>
              </div>
            )}
          </div>
          <CollapsibleContent className="py-2">
            <CodeMirror
              value={cell.source.trim()}
              theme={codeTheme}
              extensions={[
                json(),
                Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
              ]}
              onChange={onChangeSource}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />

            <CellStdio
              sessionId={session.id}
              cell={cell}
              channel={channel}
              show={showStdio}
              setShow={setShowStdio}
            />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </>
  );
}
function CodeCell(props: {
  session: SessionType;
  cell: CodeCellType;
  channel: SessionChannel;
  onUpdateCell: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => Promise<void>;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { session, cell, channel, onUpdateCell, onDeleteCell } = props;
  const [error, setError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);

  const { codeTheme } = useTheme();
  const { updateCell, clearOutput } = useCells();

  function onChangeSource(source: string) {
    onUpdateCell(cell, { source });
  }

  function evaluateModEnter() {
    runCell();
    return true;
  }

  useEffect(() => {
    function callback(payload: CellErrorPayloadType) {
      if (payload.cellId !== cell.id) {
        return;
      }

      const filenameError = payload.errors.find((e) => e.attribute === 'filename');

      if (filenameError) {
        setError(filenameError.message);
      }
    }

    channel.on('cell:error', callback);

    return () => channel.off('cell:error', callback);
  }, [cell.id, channel]);

  async function updateFilename(filename: string) {
    setError(null);
    channel.push('cell:update', {
      cellId: cell.id,
      sessionId: session.id,
      updates: { filename },
    });
  }

  function runCell() {
    if (cell.status === 'running') {
      return false;
    }
    setShowStdio(true);

    // Update client side only. The server will know it's running from the 'cell:exec' event.
    updateCell({ ...cell, status: 'running' });
    clearOutput(cell.id);

    channel.push('cell:exec', {
      sessionId: session.id,
      cellId: cell.id,
    });
  }

  function stopCell() {
    channel.push('cell:stop', { sessionId: session.id, cellId: cell.id });
  }

  return (
    <div className="relative group/cell">
      <div
        className={cn(
          'border rounded-md group',
          cell.status === 'running'
            ? 'ring ring-2 ring-run-ring border-run-ring'
            : 'focus-within:ring focus-within:ring-2 focus-within:ring-ring focus-within:border-ring',
          error ? 'outline-red-500 outline outline-1' : '',
        )}
      >
        <div className="p-1 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 w-[200px]">
            <FilenameInput
              filename={cell.filename}
              onUpdate={updateFilename}
              onChange={() => setError(null)}
              className="group-hover:border-input"
            />
            {error && <div className="text-red-600 text-sm">{error}</div>}
          </div>
          <div
            className={cn(
              'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-2',

              cell.status === 'running' ? 'opacity-100' : '',
            )}
          >
            <DeleteCellWithConfirmation onDeleteCell={() => onDeleteCell(cell)}>
              <Button variant="icon" size="icon" tabIndex={1}>
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
            {cell.status === 'running' && (
              <Button variant="run" size="default-with-icon" onClick={stopCell} tabIndex={1}>
                <Circle size={16} /> Stop
              </Button>
            )}
            {cell.status === 'idle' && (
              <Button size="default-with-icon" onClick={runCell} tabIndex={1}>
                <Play size={16} />
                Run
              </Button>
            )}
          </div>
        </div>
        <CodeMirror
          value={cell.source}
          theme={codeTheme}
          extensions={[
            javascript(),
            Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
          ]}
          onChange={onChangeSource}
        />
        <CellStdio
          sessionId={session.id}
          cell={cell}
          channel={channel}
          show={showStdio}
          setShow={setShowStdio}
        />
      </div>
    </div>
  );
}

function FilenameInput(props: {
  filename: string;
  className: string;
  onUpdate: (filename: string) => Promise<void>;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const filename = props.filename;
  const onUpdate = props.onUpdate;
  const onChange = props.onChange;

  const inputRef = useRef<HTMLInputElement | null>(null);

  return (
    <Input
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
      onChange={onChange}
      required
      defaultValue={filename}
      onBlur={() => {
        if (!inputRef.current) {
          return;
        }

        const updatedFilename = inputRef.current.value;
        if (updatedFilename !== filename) {
          onUpdate(updatedFilename);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter' && inputRef.current) {
          inputRef.current.blur();
        }
      }}
      className={cn(
        'font-mono font-semibold text-xs border-transparent hover:border-input transition-colors',
        props.className,
      )}
    />
  );
}

SessionPage.loader = loader;
export default SessionPage;
