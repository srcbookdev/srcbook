/* eslint-disable jsx-a11y/tabindex-no-positive -- this should be fixed and reworked or minimize excessive positibe tabindex */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Dialog, DialogContent } from '../ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../ui/tooltip';
import Shortcut from '../keyboard-shortcut';
import { useNavigate } from 'react-router-dom';
import CodeMirror, { KeyBinding, keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '../ui/resizable';
import {
  Info,
  Play,
  Trash2,
  Sparkles,
  X,
  MessageCircleWarning,
  LoaderCircle,
  Maximize,
  Minimize,
  CopyIcon,
} from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import AiGenerateTipsDialog from '../ai-generate-tips-dialog';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  TsServerDiagnosticType,
} from '@srcbook/shared';
import { cn } from '../../lib/utils';
import { CellModeType, SessionType } from '@/types';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import DeleteCellWithConfirmation from '../delete-cell-dialog';
import { useCells } from '../use-cell';
import { CellOutput } from '../cell-output';
import useTheme from '../use-theme';
import { useDebouncedCallback } from 'use-debounce';
import { EditorView } from 'codemirror';
import { EditorState, Extension } from '@codemirror/state';
import { unifiedMergeView } from '@codemirror/merge';
import { type Diagnostic, linter } from '@codemirror/lint';
import { tsHover } from './hover';
import { mapTsServerLocationToCM } from './util';
import { toast } from 'sonner';
import { PrettierLogo } from '../logos';
import { autocompletion } from '@codemirror/autocomplete';
import { getCompletions } from './get-completions';

const DEBOUNCE_DELAY = 500;

type BaseProps = {
  session: SessionType;
  cell: CodeCellType;
};

type RegularProps = BaseProps & {
  readOnly?: false;
  aiEnabled: boolean;
  aiFixDiagnostics: (diagnostics: string) => void;
  cellMode: CellModeType;
  // channel: SessionChannel;
  filenameError: string | null;
  fixDiagnostics: (diagnostics: string) => void;
  fullscreen: boolean;
  generationType: 'edit' | 'fix';
  newSource: string;
  onAccept: () => void;
  onChangeCellModeType: (newCellMode: CellModeType) => void;
  onChangeFilenameError: (newError: string | null) => void;
  onChangeFullscreen: (value: boolean) => void;
  onChangeGenerationType: (newGenerationType: 'edit' | 'fix') => void;
  onChangeNewSource: (newSource: string) => void;
  onChangePrompt: (newPrompt: string) => void;
  onChangeShowStdio: (showStdio: boolean) => void;
  onDeleteCell: (cell: CellType) => void;
  onFormatCell: () => void;
  onGenerate: () => void;
  onGetDefinitionContents: (pos: number, cell: CodeCellType) => Promise<string>;
  onRevert: () => void;
  onRunCell: () => void;
  onStopCell: () => void;
  onUpdateFileName: (filename: string) => void;
  prompt: string;
  showStdio: boolean;
  updateCellOnClient: (cell: CodeCellType) => void;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
};
type ReadOnlyProps = BaseProps & { readOnly: true };
type Props = RegularProps | ReadOnlyProps;

export default function CodeCell(props: Props) {
  return (
    <div id={`cell-${props.cell.id}`}>
      {!props.readOnly ? (
        <Dialog open={props.fullscreen} onOpenChange={props.onChangeFullscreen}>
          <DialogContent
            className={cn(
              `w-[95vw] h-[95vh] max-w-none p-0 group flex flex-col`,
              props.cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
              (props.cellMode === 'generating' || props.cellMode === 'fixing') &&
                'ring-1 ring-ai-ring border-ai-ring',
              props.cell.status !== 'running' &&
                props.cellMode !== 'generating' &&
                props.cellMode !== 'fixing' &&
                'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
            )}
            hideClose
          >
            <Header
              cell={props.cell}
              runCell={props.onRunCell}
              stopCell={props.onStopCell}
              onDeleteCell={!props.readOnly ? props.onDeleteCell : null}
              generate={props.onGenerate}
              cellMode={props.cellMode}
              setCellMode={props.onChangeCellModeType}
              prompt={props.prompt}
              setPrompt={props.onChangePrompt}
              updateFilename={props.onUpdateFileName}
              filenameError={props.filenameError}
              setFilenameError={props.onChangeFilenameError}
              fullscreen={props.fullscreen}
              setFullscreen={props.onChangeFullscreen}
              setShowStdio={props.onChangeShowStdio}
              onAccept={props.onAccept}
              onRevert={props.onRevert}
              formatCell={props.onFormatCell}
              aiEnabled={!props.readOnly ? props.aiEnabled : false}
            />

            {props.cellMode === 'reviewing' ? (
              <DiffEditor original={props.cell.source} modified={props.newSource} />
            ) : (
              <ResizablePanelGroup direction="vertical">
                <ResizablePanel style={{ overflow: 'scroll' }} defaultSize={60}>
                  <div className={cn(props.cellMode !== 'off' && 'opacity-50')} id={props.cell.filename}>
                    <CodeEditor
                      readOnly={['generating', 'prompting', 'formatting'].includes(props.cellMode)}
                      channel={props.channel}
                      session={props.session}
                      cell={props.cell}
                      runCell={props.onRunCell}
                      formatCell={props.onFormatCell}
                      updateCellOnServer={props.updateCellOnServer}
                      onGetDefinitionContents={props.onGetDefinitionContents}
                    />
                  </div>
                </ResizablePanel>

                <ResizableHandle withHandle className="border-none" />
                <ResizablePanel defaultSize={40} style={{ overflow: 'scroll' }}>
                  <CellOutput
                    cell={props.cell}
                    show={props.showStdio}
                    setShow={props.onChangeShowStdio}
                    fullscreen={props.fullscreen}
                    setFullscreen={props.onChangeFullscreen}
                    fixDiagnostics={props.aiFixDiagnostics}
                    cellMode={props.cellMode}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            )}
          </DialogContent>
        </Dialog>
      ) : null}

      <div className="relative group/cell" id={`cell-${props.cell.id}`}>
        <div
          className={cn(
            'border rounded-md group',
            props.cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
            !props.readOnly && (props.cellMode === 'generating' || props.cellMode === 'fixing') &&
              'ring-1 ring-ai-ring border-ai-ring',
            !props.readOnly && props.cell.status !== 'running' &&
              props.cellMode !== 'generating' &&
              props.cellMode !== 'fixing' &&
              'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
          )}
        >
          {props.readOnly ? (
            <div className="p-1 flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                <span className="w-[200px] font-mono font-semibold text-xs transition-colors px-2">
                  {props.cell.filename}
                </span>
              </div>
              <div className="opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-2">
                <div className="flex items-center gap-1">
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="icon"
                          className="w-8 px-0"
                          size="icon"
                          onClick={() => {
                            navigator.clipboard.writeText(props.cell.source);
                            toast.success('Copied to clipboard.');
                          }}
                          tabIndex={1}
                        >
                          <CopyIcon size={16} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Copy to clipboard</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </div>
            </div>
          ) : (
            <Header
              cell={props.cell}
              runCell={props.onRunCell}
              stopCell={props.onStopCell}
              onDeleteCell={!props.readOnly ? props.onDeleteCell : null}
              generate={props.onGenerate}
              cellMode={props.cellMode}
              setCellMode={props.onChangeCellModeType}
              prompt={props.prompt}
              setPrompt={props.onChangePrompt}
              updateFilename={props.onUpdateFileName}
              filenameError={props.filenameError}
              setFilenameError={props.onChangeFilenameError}
              fullscreen={props.fullscreen}
              setFullscreen={props.onChangeFullscreen}
              setShowStdio={props.onChangeShowStdio}
              onAccept={props.onAccept}
              onRevert={props.onRevert}
              formatCell={props.onFormatCell}
              aiEnabled={props.aiEnabled}
            />
          )}

          {!props.readOnly && props.cellMode === 'reviewing' ? (
            <DiffEditor original={props.cell.source} modified={props.newSource} />
          ) : (
            <>
              <div className={cn(!props.readOnly && props.cellMode !== 'off' && 'opacity-50')} id={props.cell.filename}>
                {props.readOnly ? (
                  <CodeEditor readOnly session={props.session} cell={props.cell} />
                ) : (
                  <CodeEditor
                    readOnly={['generating', 'prompting', 'formatting'].includes(props.cellMode)}
                    channel={props.channel}
                    session={props.session}
                    cell={props.cell}
                    runCell={props.onRunCell}
                    formatCell={props.onFormatCell}
                    updateCellOnServer={props.updateCellOnServer}
                  />
                )}
              </div>
              {!props.readOnly ? (
                <CellOutput
                  cell={props.cell}
                  show={props.showStdio}
                  setShow={props.onChangeShowStdio}
                  fixDiagnostics={props.aiFixDiagnostics}
                  cellMode={props.cellMode}
                  fullscreen={props.fullscreen}
                  setFullscreen={props.onChangeFullscreen}
                />
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Header(props: {
  cell: CodeCellType;
  runCell: () => void;
  onDeleteCell: ((cell: CellType) => void) | null;
  cellMode: CellModeType;
  setCellMode: (mode: CellModeType) => void;
  updateFilename: (filename: string) => void;
  filenameError: string | null;
  setFilenameError: (error: string | null) => void;
  fullscreen: boolean;
  setFullscreen: (open: boolean) => void;
  setShowStdio: (open: boolean) => void;
  generate: () => void;
  prompt: string;
  setPrompt: (prompt: string) => void;
  stopCell: () => void;
  onAccept: () => void;
  onRevert: () => void;
  formatCell: () => void;
  aiEnabled: boolean;
}) {
  const {
    cell,
    runCell,
    onDeleteCell,
    cellMode,
    setCellMode,
    updateFilename,
    filenameError,
    setFilenameError,
    fullscreen,
    setFullscreen,
    setShowStdio,
    generate,
    prompt,
    setPrompt,
    stopCell,
    formatCell,
    aiEnabled,
  } = props;

  const navigate = useNavigate();

  return (
    <>
      <div className="p-1 flex items-center justify-between gap-2">
        <div className={cn('flex items-center gap-1', cellMode !== 'off' && 'opacity-50')}>
          <FilenameInput
            filename={cell.filename}
            onUpdate={updateFilename}
            onChange={() => setFilenameError(null)}
            className={cn(
              'w-[200px] font-mono font-semibold text-xs transition-colors px-2',
              filenameError
                ? 'border-error'
                : 'border-transparent hover:border-input group-hover:border-input ',
            )}
          />
          {filenameError && (
            <div className="bg-error text-error-foreground flex items-center rounded-sm border border-transparent px-[10px] py-2 text-sm leading-none font-medium">
              <Info size={14} className="mr-1.5" />
              Invalid filename
            </div>
          )}
          {onDeleteCell !== null ? (
            <DeleteCellWithConfirmation onDeleteCell={() => onDeleteCell(cell)}>
              <Button className="hidden group-hover:flex" variant="icon" size="icon" tabIndex={1}>
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
          ) : (
            <Button className="hidden group-hover:flex" variant="icon" size="icon" disabled>
              <Trash2 size={16} />
            </Button>
          )}
        </div>
        <div
          className={cn(
            'opacity-0 group-hover:opacity-100 group-focus-within:opacity-100 transition-opacity flex gap-2',

            cell.status === 'running' ||
              cellMode === 'fixing' ||
              cellMode === 'generating' ||
              cellMode === 'reviewing'
              ? 'opacity-100'
              : '',
          )}
        >
          <div className="flex items-center gap-1">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    disabled={cellMode !== 'off'}
                    onClick={formatCell}
                    tabIndex={1}
                  >
                    <PrettierLogo size={14} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Format using Prettier</TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    className="w-8 px-0"
                    size="icon"
                    onClick={() => {
                      // Open stdout drawer in fullscreen mode.
                      if (!fullscreen) setShowStdio(true);
                      setFullscreen(!fullscreen);
                    }}
                    tabIndex={1}
                  >
                    {fullscreen ? <Minimize size={16} /> : <Maximize size={16} />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {fullscreen ? 'Minimize back to cells view' : 'Maximize to full screen'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="icon"
                    size="icon"
                    disabled={cellMode !== 'off'}
                    onClick={() => setCellMode('prompting')}
                    tabIndex={1}
                  >
                    <Sparkles size={16} />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Edit cell using AI</TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
          {cellMode === 'prompting' && (
            <Button variant="default" onClick={generate} tabIndex={1} disabled={!aiEnabled}>
              Generate
            </Button>
          )}
          {cellMode === 'generating' && (
            <Button
              variant="ai"
              size="default-with-icon"
              className="disabled:opacity-100"
              disabled
              tabIndex={1}
            >
              <LoaderCircle size={16} className="animate-spin" /> Generating
            </Button>
          )}
          {cellMode === 'fixing' && (
            <Button
              variant="ai"
              size="default-with-icon"
              className="disabled:opacity-100"
              disabled
              tabIndex={1}
            >
              <LoaderCircle size={16} className="animate-spin" /> Fixing...
            </Button>
          )}
          {cellMode === 'reviewing' && (
            <div className="flex items-center gap-2">
              <Button variant="secondary" onClick={props.onRevert}>
                Revert
              </Button>
              <Button onClick={props.onAccept}>Accept</Button>
            </div>
          )}
          {['off', 'formatting'].includes(cellMode) && (
            <>
              {cell.status === 'running' && (
                <Button variant="run" size="default-with-icon" onClick={stopCell} tabIndex={1}>
                  <LoaderCircle size={16} className="animate-spin" /> Stop
                </Button>
              )}
              {cell.status === 'idle' && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button size="default-with-icon" onClick={runCell} tabIndex={1}>
                        <Play size={16} />
                        Run
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <Shortcut keys={['mod', 'enter']} /> to run cell
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
        </div>
      </div>
      {['prompting', 'generating'].includes(cellMode) && (
        <div className="flex flex-col gap-1.5">
          <div className="flex items-start justify-between px-1">
            <div className="flex items-start flex-grow">
              <Sparkles size={16} className="m-2.5" />
              <TextareaAutosize
                className="flex w-full rounded-sm bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none resize-none"
                // eslint-disable-next-line jsx-a11y/no-autofocus -- needed for action flow, should not limit accessibility
                autoFocus
                placeholder="Ask the AI to edit this cell..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1">
              <AiGenerateTipsDialog>
                <Button size="icon" variant="icon">
                  <MessageCircleWarning size={16} />
                </Button>
              </AiGenerateTipsDialog>
              <Button
                size="icon"
                variant="icon"
                onClick={() => {
                  setCellMode('off');
                  setPrompt('');
                }}
              >
                <X size={16} />
              </Button>
            </div>
          </div>

          {!aiEnabled && (
            <div className="flex items-center justify-between bg-warning text-warning-foreground rounded-sm text-sm px-3 py-1 m-3">
              <p>AI provider not configured.</p>
              <button
                className="font-medium underline cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                Settings
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function tsCategoryToSeverity(
  diagnostic: Pick<TsServerDiagnosticType, 'category' | 'code'>,
): Diagnostic['severity'] {
  if (diagnostic.code === 7027) {
    return 'warning';
  }
  // force resolve types with fallback
  switch (diagnostic.category) {
    case 'error':
      return 'error';
    case 'warning':
      return 'warning';
    case 'suggestion':
      return 'warning';
    case 'info':
      return 'info';
    default:
      return 'info';
  }
}

function isDiagnosticWithLocation(
  diagnostic: TsServerDiagnosticType,
): diagnostic is TsServerDiagnosticType {
  return !!(typeof diagnostic.start.line === 'number' && typeof diagnostic.end.line === 'number');
}

function tsDiagnosticMessage(diagnostic: TsServerDiagnosticType): string {
  if (typeof diagnostic.text === 'string') {
    return diagnostic.text;
  }
  return JSON.stringify(diagnostic); // Fallback
}

function convertTSDiagnosticToCM(diagnostic: TsServerDiagnosticType, code: string): Diagnostic {
  const message = tsDiagnosticMessage(diagnostic);

  return {
    from: mapTsServerLocationToCM(code, diagnostic.start.line, diagnostic.start.offset),
    to: mapTsServerLocationToCM(code, diagnostic.end.line, diagnostic.end.offset),
    message: message,
    severity: tsCategoryToSeverity(diagnostic),
    renderMessage: () => {
      const dom = document.createElement('div');
      dom.className = 'p-2 space-y-3 border-t max-w-lg max-h-64 text-xs relative';
      dom.innerText = message;

      return dom;
    },
  };
}

function tsLinter(
  cell: CodeCellType,
  getTsServerDiagnostics: (id: string) => TsServerDiagnosticType[],
  getTsServerSuggestions: (id: string) => TsServerDiagnosticType[],
) {
  const semanticDiagnostics = getTsServerDiagnostics(cell.id);
  const syntaticDiagnostics = getTsServerSuggestions(cell.id);
  const diagnostics = [...syntaticDiagnostics, ...semanticDiagnostics].filter(
    isDiagnosticWithLocation,
  );

  const cm_diagnostics = diagnostics.map((diagnostic) => {
    return convertTSDiagnosticToCM(diagnostic, cell.source);
  });

  return linter(async (): Promise<readonly Diagnostic[]> => {
    return cm_diagnostics;
  });
}

type CodeEditorBaseProps = {
  cell: CodeCellType;
  session: SessionType;
};
type CodeEditorRegularProps = CodeEditorBaseProps & {
  readOnly?: false;
  // channel: SessionChannel;
  runCell: () => void;
  formatCell: () => void;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  onGetDefinitionContents: (pos: number, cell: CodeCellType) => Promise<string>;
};
type CodeEditorReadOnlyProps = CodeEditorBaseProps & {
  readOnly: true;
  // channel?: SessionChannel;
  runCell?: () => void;
  formatCell?: () => void;
  updateCellOnServer?: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  onGetDefinitionContents?: (pos: number, cell: CodeCellType) => Promise<string>;
};
type CodeEditorProps = CodeEditorRegularProps | CodeEditorReadOnlyProps;

function CodeEditor({
  readOnly,
  channel,
  cell,
  session,
  runCell,
  formatCell,
  updateCellOnServer,
  onGetDefinitionContents,
}: CodeEditorProps) {
  const { theme, codeTheme } = useTheme();

  const {
    updateCell: updateCellOnClient,
    getTsServerDiagnostics,
    getTsServerSuggestions,
  } = useCells();

  const updateCellOnServerOrNoop = useCallback<NonNullable<typeof updateCellOnServer>>(
    (cell, attrs) => {
      if (!updateCellOnServer) {
        return;
      }
      updateCellOnServer(cell, attrs);
    },
    [updateCellOnServer],
  );
  const updateCellOnServerDebounced = useDebouncedCallback(
    updateCellOnServerOrNoop,
    DEBOUNCE_DELAY,
  );

  // The order of these extensions is important.
  // We want the errors to be first, so we call tsLinter before tsHover.
  const extensions = useMemo(() => {
    const extensions: Array<Extension> = [javascript({ typescript: true })];
    extensions.push(tsLinter(cell, getTsServerDiagnostics, getTsServerSuggestions));
    if (typeof channel !== 'undefined') {
      extensions.push(tsHover(session.id, cell, channel, theme));
    }
    if (typeof channel !== 'undefined') {
      extensions.push(
        autocompletion({
          override: [(context) => getCompletions(context, session.id, cell, channel)],
        }),
      );
    }
    extensions.push(
      Prec.highest(
        EditorView.domEventHandlers({
          click: (e, view) => {
            if (!onGetDefinitionContents) {
              return;
            }
            const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
            if (pos && e.altKey) {
              onGetDefinitionContents(pos, cell).then(result => {
                setModalContent(result);
                setIsModalOpen(true);
              }).catch((error) => {
                console.error('Error calling onGetDefinitionContents:', error);
                toast.error('Error calling goto definition!');
              });
            }
          },
        }),
      ),
    );

    const keys: Array<KeyBinding> = [];
    if (runCell) {
      keys.push({
        key: 'Mod-Enter',
        run: () => {
          runCell();
          return true;
        },
      });
    }
    if (formatCell) {
      keys.push({
        key: 'Shift-Alt-f',
        run: () => {
          formatCell();
          return true;
        },
      });
    }
    extensions.push(Prec.highest(keymap.of(keys)));

    return extensions;
  }, [
    session,
    cell,
    channel,
    theme,
    getTsServerDiagnostics,
    getTsServerSuggestions,
    formatCell,
    runCell,
  ]);

  if (readOnly) {
    extensions.push(EditorView.editable.of(false));
    extensions.push(EditorState.readOnly.of(true));
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

  return (
    <>
      <CodeMirror
        value={cell.source}
        theme={codeTheme}
        extensions={extensions}
        onChange={(source) => {
          updateCellOnClient({ ...cell, source });
          updateCellOnServerDebounced(cell, { source });
        }}
      />
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="w-[80vw] h-[80vh] max-w-none p-0 overflow-scroll">
          <CodeMirror
            className="overflow-scroll focus-visible:outline-none"
            value={modalContent}
            theme={codeTheme}
            extensions={[
              javascript({ typescript: true }),
              EditorView.editable.of(false),
              EditorState.readOnly.of(true),
            ]}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

function DiffEditor({ original, modified }: { original: string; modified: string }) {
  const { codeTheme } = useTheme();

  return (
    <div className="flex flex-col">
      <CodeMirror
        value={modified}
        theme={codeTheme}
        extensions={[
          javascript({ typescript: true }),
          EditorView.editable.of(false),
          EditorState.readOnly.of(true),
          unifiedMergeView({
            original: original,
            mergeControls: false,
            highlightChanges: false,
          }),
        ]}
      />
    </div>
  );
}

function FilenameInput(props: {
  filename: string;
  className: string;
  onUpdate: (filename: string) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  const onUpdate = props.onUpdate;
  const onChange = props.onChange;

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [filename, setFilename] = useState(props.filename);

  useEffect(() => {
    if (filename !== props.filename) {
      setFilename(props.filename);
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.filename]);

  function submit() {
    if (props.filename !== filename) {
      onUpdate(filename);
    }
  }

  function blurOnEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
    }
  }

  return (
    <Input
      required
      ref={inputRef}
      value={filename}
      onBlur={submit}
      onKeyDown={blurOnEnter}
      onChange={(e) => {
        setFilename(e.target.value);
        onChange(e);
      }}
      className={props.className}
    />
  );
}
