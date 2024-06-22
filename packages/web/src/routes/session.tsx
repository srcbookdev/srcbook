import { useCallback, useEffect, useRef, useState } from 'react';
import { marked } from 'marked';
import Markdown from 'marked-react';
import { useLoaderData, type LoaderFunctionArgs } from 'react-router-dom';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { json } from '@codemirror/lang-json';
import { markdown } from '@codemirror/lang-markdown';
import { CircleAlert, Circle, Play, Trash2, Pencil, ChevronRight } from 'lucide-react';
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
import { SessionType } from '@/types';
import SessionMenu from '@/components/session-menu';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { EditableH1 } from '@/components/ui/heading';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import InstallPackageModal from '@/components/install-package-modal';
import { SessionChannel } from '@/clients/websocket';
import { CellsProvider, useCells } from '@/components/use-cell';
import { toast } from 'sonner';
import useEffectOnce from '@/components/use-effect-once';
import { CellStdio } from '@/components/cell-stdio';
import useTheme from '@/components/use-theme';
import { useHotkeys } from 'react-hotkeys-hook';

marked.use({ gfm: true });

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

  async function onUpdateCell<T extends CellType>(
    cell: T,
    updates: CellUpdateAttrsType,
    getValidationError?: (cell: T) => string | null,
  ) {
    getValidationError = getValidationError || (() => null);
    updateCell({ ...cell, ...(updates as Partial<T>) });

    const error = getValidationError({ ...cell, ...(updates as Partial<T>) });
    if (typeof error === 'string') {
      return error;
    }

    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
    return null;
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
        className="fixed right-3 top-12 text-muted-foreground text-sm hover:cursor-pointer"
        onClick={toggleTheme}
      >
        toggle theme
      </p>

      <SessionMenu session={session} />

      <div>
        {cells.map((cell, idx) => (
          <div key={`wrapper-${cell.id}`}>
            {idx > 1 && (
              <div className="flex items-center gap-2 min-h-10 opacity-0 hover:opacity-100 transition-all">
                <div className="flex-grow border-t border-foreground"></div>
                <Button variant="secondary" onClick={() => createNewCell('code', idx)}>
                  Code
                </Button>
                <Button variant="secondary" onClick={() => createNewCell('markdown', idx)}>
                  Markdown
                </Button>
                <div className="flex-grow border-t border-foreground"></div>
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

      {/** -- Add some padding at the bottom to make it more breathable + activate the new cell more easily */}
      <div className="min-h-64 opacity-0 hover:opacity-100 transition-all">
        <div className="flex items-center gap-2 min-h-10">
          <div className="flex-grow border-t border-foreground"></div>
          <Button variant="secondary" onClick={() => createNewCell('code', cells.length)}>
            Code
          </Button>
          <Button variant="secondary" onClick={() => createNewCell('markdown', cells.length)}>
            Markdown
          </Button>
          <div className="flex-grow border-t border-foreground"></div>
        </div>
      </div>
    </div>
  );
}

function Cell(props: {
  cell: CellType;
  session: SessionType;
  channel: SessionChannel;
  onUpdateCell: <T extends CellType>(
    cell: T,
    attrs: CellUpdateAttrsType,
    getValidationError?: (cell: T) => string | null,
  ) => Promise<string | null>;
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
  onUpdateCell: (
    cell: TitleCellType,
    attrs: TitleCellUpdateAttrsType,
    getValidationError?: (cell: TitleCellType) => string | null,
  ) => Promise<string | null>;
}) {
  return (
    <div id={`cell-${props.cell.id}`} className="mb-4">
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
  onUpdateCell: (
    cell: MarkdownCellType,
    attrs: MarkdownCellUpdateAttrsType,
    getValidationError?: (cell: MarkdownCellType) => string | null,
  ) => Promise<string | null>;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { codeTheme } = useTheme();
  const cell = props.cell;
  const defaultState = cell.text ? 'view' : 'edit';
  const [status, setStatus] = useState<'edit' | 'view'>(defaultState);
  const [text, setText] = useState(cell.text);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'edit') {
      setText(cell.text);
    }
  }, [status, cell]);

  const keyMap = Prec.highest(
    keymap.of([
      {
        key: 'Mod-Enter',
        run: () => {
          onSave();
          return true;
        },
      },
      {
        key: 'Escape',
        run: () => {
          setStatus('view');
          return true;
        },
      },
    ]),
  );

  function getValidationError(cell: MarkdownCellType) {
    const tokens = marked.lexer(cell.text);
    const hasH1 = tokens?.some((token) => token.type === 'heading' && token.depth === 1);
    const hasH6 = tokens?.some((token) => token.type === 'heading' && token.depth === 6);

    if (hasH1 || hasH6) {
      return 'Markdown cells cannot use h1 or h6 headings, these are reserved for srcbook.';
    }
    return null;
  }

  async function onSave() {
    const error = await props.onUpdateCell(cell, { text }, getValidationError);
    setError(error);
    if (error === null) {
      setStatus('view');
      return true;
    }
  }

  return (
    <div
      id={`cell-${props.cell.id}`}
      onDoubleClick={() => setStatus('edit')}
      className={cn(
        'group/cell relative w-full pb-3 rounded-md border border-transparent hover:border-border transition-all',
        status === 'edit' && 'ring-1 ring-ring border-ring hover:border-ring',
        error && 'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30',
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
        <>
          {error && (
            <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
              <CircleAlert size={16} />
              <p className="text-xs">{error}</p>
            </div>
          )}
          <div className="flex flex-col">
            <div className="p-1 w-full flex items-center justify-between z-10">
              <h5 className="pl-4 text-sm font-mono font-bold">Markdown</h5>
              <div className="flex items-center gap-1">
                <DeleteCellWithConfirmation onDeleteCell={() => props.onDeleteCell(cell)}>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="border-secondary hover:border-muted"
                  >
                    <Trash2 size={16} />
                  </Button>
                </DeleteCellWithConfirmation>

                <Button variant="secondary" onClick={() => setStatus('view')}>
                  Cancel
                </Button>

                <Button onClick={onSave}>Save</Button>
              </div>
            </div>

            <div className="px-3">
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
        </>
      )}
    </div>
  );
}

function PackageJsonCell(props: {
  cell: PackageJsonCellType;
  channel: SessionChannel;
  session: SessionType;
  onUpdateCell: (
    cell: PackageJsonCellType,
    attrs: PackageJsonCellUpdateAttrsType,
    getValidationError?: (cell: PackageJsonCellType) => string | null,
  ) => Promise<string | null>;
}) {
  const { cell, channel, session, onUpdateCell } = props;

  const [open, setOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [showStdio, setShowStdio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHotkeys('meta+i', () => {
    if (!installModalOpen) {
      setInstallModalOpen(true);
    }
  });

  const { updateCell, clearOutput } = useCells();
  const { codeTheme } = useTheme();

  const npmInstall = useCallback(
    (packages?: Array<string>) => {
      if (getValidationError(cell)) return;
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

  function getValidationError(cell: PackageJsonCellType) {
    try {
      JSON.parse(cell.source);
      return null;
    } catch (e) {
      const err = e as Error;
      return err.message;
    }
  }
  async function onChangeSource(source: string) {
    const error = await onUpdateCell(cell, { source }, getValidationError);
    setError(error);
  }

  function evaluateModEnter() {
    npmInstall();
    return true;
  }

  return (
    <div id={`cell-${props.cell.id}`} className="relative">
      {error && open && (
        <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
          <CircleAlert size={16} />
          <p className="text-xs">{error}</p>
        </div>
      )}
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
                  'border rounded-md group ring-1 ring-ring border-ring',
                  cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
                  error && 'ring-sb-red-30 border-sb-red-30',
                )
              : ''
          }
        >
          <div className="flex w-full justify-between items-start">
            <CollapsibleTrigger className="flex gap-3" asChild>
              <div>
                <Button
                  variant="secondary"
                  className={cn(
                    'font-mono font-semibold active:translate-y-0 flex items-center gap-2 pr-1 hover:bg-transparent',
                    open && 'border-transparent',
                    error && !open && 'border-sb-red-30 ring-1 ring-sb-red-30',
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
              <div className="flex items-center gap-2 p-1">
                <Button variant="secondary" onClick={() => setInstallModalOpen(true)}>
                  Install package
                </Button>
                <Button
                  size="default-with-icon"
                  onClick={() => npmInstall()}
                  disabled={cell.status !== 'idle' || !!error}
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

            <CellStdio cell={cell} show={showStdio} setShow={setShowStdio} />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
function CodeCell(props: {
  session: SessionType;
  cell: CodeCellType;
  channel: SessionChannel;
  onUpdateCell: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => Promise<string | null>;
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
    <div className="relative group/cell" id={`cell-${props.cell.id}`}>
      <div
        className={cn(
          'border rounded-md group',
          cell.status === 'running'
            ? 'ring-1 ring-run-ring border-run-ring'
            : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
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
        <CellStdio cell={cell} show={showStdio} setShow={setShowStdio} />
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
