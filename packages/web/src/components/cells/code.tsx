/* eslint-disable jsx-a11y/tabindex-no-positive -- this should be fixed and reworked or minimize excessive positibe tabindex */

import { useEffect, useRef, useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import Shortcut from '@/components/keyboard-shortcut';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from '@/components/ui/resizable';
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
} from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import AiGenerateTipsDialog from '@/components/ai-generate-tips-dialog';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  CellErrorPayloadType,
  CellFormattedPayloadType,
  AiGeneratedCellPayloadType,
  TsServerDiagnosticType,
  TsServerDefinitionLocationResponsePayloadType,
} from '@srcbook/shared';
import { useSettings } from '@/components/use-settings';
import { cn } from '@/lib/utils';
import { CellModeType, SessionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from '@/components/use-cell';
import { CellOutput } from '@/components/cell-output';
import useTheme from '@/components/use-theme';
import { useDebouncedCallback } from 'use-debounce';
import { EditorView } from 'codemirror';
import { EditorState } from '@codemirror/state';
import { unifiedMergeView } from '@codemirror/merge';
import { type Diagnostic, linter } from '@codemirror/lint';
import { tsHover } from './hover';
import { mapCMLocationToTsServer, mapTsServerLocationToCM } from './util';
import { toast } from 'sonner';
import { PrettierLogo } from '../logos';
import { getFileContent } from '@/lib/server';
import { autocompletion } from '@codemirror/autocomplete';
import { getCompletions } from './get-completions';

const DEBOUNCE_DELAY = 500;

export default function CodeCell(props: {
  session: SessionType;
  cell: CodeCellType;
  channel: SessionChannel;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { session, cell, channel, updateCellOnServer, onDeleteCell } = props;
  const [filenameError, _setFilenameError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);
  const [cellMode, setCellMode] = useState<CellModeType>('off');
  const [generationType, setGenerationType] = useState<'edit' | 'fix'>('edit');
  const [prompt, setPrompt] = useState('');
  const [newSource, setNewSource] = useState('');
  const [fullscreen, setFullscreen] = useState(false);
  const { aiEnabled } = useSettings();
  useHotkeys(
    'mod+enter',
    () => {
      if (!prompt) return;
      if (cellMode !== 'prompting') return;
      if (!aiEnabled) return;
      generate();
    },
    { enableOnFormTags: ['textarea'] },
  );

  useHotkeys(
    'escape',
    () => {
      if (cellMode === 'prompting') {
        setCellMode('off');
        setPrompt('');
      }
    },

    { enableOnFormTags: ['textarea'] },
  );

  const { updateCell: updateCellOnClient, clearOutput } = useCells();

  function setFilenameError(error: string | null) {
    _setFilenameError(error);
    setTimeout(() => _setFilenameError(null), 3000);
  }

  useEffect(() => {
    function callback(payload: CellErrorPayloadType) {
      if (payload.cellId !== cell.id) {
        return;
      }

      const filenameError = payload.errors.find((e) => e.attribute === 'filename');

      if (filenameError) {
        setFilenameError(filenameError.message);
      }

      const formattingError = payload.errors.find((e) => e.attribute === 'formatting');
      if (formattingError) {
        toast.error(formattingError.message);
        setCellMode('off');
      }
    }

    channel.on('cell:error', callback);

    return () => channel.off('cell:error', callback);
  }, [cell.id, channel]);

  useEffect(() => {
    function callback(payload: CellFormattedPayloadType) {
      if (payload.cellId === cell.id) {
        updateCellOnClient({ ...payload.cell });
        setCellMode('off');
      }
    }

    channel.on('cell:formatted', callback);
    return () => channel.off('cell:formatted', callback);
  }, [cell.id, channel, updateCellOnClient]);

  function updateFilename(filename: string) {
    updateCellOnClient({ ...cell, filename });
    channel.push('cell:rename', {
      sessionId: session.id,
      cellId: cell.id,
      filename,
    });
  }

  useEffect(() => {
    function callback(payload: AiGeneratedCellPayloadType) {
      if (payload.cellId !== cell.id) return;
      // We move to the "review" stage of the generation process:
      setNewSource(payload.output);
      setCellMode('reviewing');
    }
    channel.on('ai:generated', callback);
    return () => channel.off('ai:generated', callback);
  }, [cell.id, channel]);

  const generate = () => {
    setGenerationType('edit');
    channel.push('ai:generate', {
      sessionId: session.id,
      cellId: cell.id,
      prompt,
    });
    setCellMode('generating');
  };

  const aiFixDiagnostics = (diagnostics: string) => {
    setCellMode('fixing');
    setGenerationType('fix');
    channel.push('ai:fix_diagnostics', { sessionId: session.id, cellId: cell.id, diagnostics });
  };

  function runCell() {
    if (cell.status === 'running') {
      return false;
    }

    setShowStdio(true);

    // Update client side only. The server will know it's running from the 'cell:exec' event.
    updateCellOnClient({ ...cell, status: 'running' });
    clearOutput(cell.id);

    // Add artificial delay to allow debounced updates to propagate
    // TODO: Handle this in a more robust way
    setTimeout(() => {
      channel.push('cell:exec', {
        sessionId: session.id,
        cellId: cell.id,
      });
    }, DEBOUNCE_DELAY + 10);
  }

  function stopCell() {
    channel.push('cell:stop', { sessionId: session.id, cellId: cell.id });
  }

  function onRevertDiff() {
    setCellMode(generationType === 'edit' ? 'prompting' : 'off');
    setNewSource('');
  }

  function onAcceptDiff() {
    updateCellOnClient({ ...cell, source: newSource });
    updateCellOnServer(cell, { source: newSource });
    setPrompt('');
    setCellMode('off');
  }

  function formatCell() {
    setCellMode('formatting');
    channel.push('cell:format', {
      sessionId: session.id,
      cellId: cell.id,
    });
  }
  return (
    <div id={`cell-${props.cell.id}`}>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className={cn(
            `w-[95vw] h-[95vh] max-w-none p-0 group flex flex-col`,
            cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
            (cellMode === 'generating' || cellMode === 'fixing') &&
              'ring-1 ring-ai-ring border-ai-ring',
            cell.status !== 'running' &&
              cellMode !== 'generating' &&
              cellMode !== 'fixing' &&
              'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
          )}
          hideClose
        >
          <Header
            cell={cell}
            runCell={runCell}
            stopCell={stopCell}
            onDeleteCell={onDeleteCell}
            generate={generate}
            cellMode={cellMode}
            setCellMode={setCellMode}
            prompt={prompt}
            setPrompt={setPrompt}
            updateFilename={updateFilename}
            filenameError={filenameError}
            setFilenameError={setFilenameError}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            setShowStdio={setShowStdio}
            onAccept={onAcceptDiff}
            onRevert={onRevertDiff}
            formatCell={formatCell}
          />

          {cellMode === 'reviewing' ? (
            <DiffEditor original={cell.source} modified={newSource} />
          ) : (
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel style={{ overflow: 'scroll' }} defaultSize={60}>
                <div className={cn(cellMode !== 'off' && 'opacity-50')} id={cell.filename}>
                  <CodeEditor
                    channel={channel}
                    session={session}
                    cell={cell}
                    runCell={runCell}
                    formatCell={formatCell}
                    updateCellOnServer={updateCellOnServer}
                    readOnly={['generating', 'prompting', 'fixing', 'formatting'].includes(
                      cellMode,
                    )}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="border-none" />
              <ResizablePanel defaultSize={40} style={{ overflow: 'scroll' }}>
                <CellOutput
                  cell={cell}
                  show={showStdio}
                  setShow={setShowStdio}
                  fullscreen={fullscreen}
                  setFullscreen={setFullscreen}
                  fixDiagnostics={aiFixDiagnostics}
                  cellMode={cellMode}
                />
              </ResizablePanel>
            </ResizablePanelGroup>
          )}
        </DialogContent>
      </Dialog>

      <div className="relative group/cell" id={`cell-${props.cell.id}`}>
        <div
          className={cn(
            'border rounded-md group',
            cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
            (cellMode === 'generating' || cellMode === 'fixing') &&
              'ring-1 ring-ai-ring border-ai-ring',
            cell.status !== 'running' &&
              cellMode !== 'generating' &&
              cellMode !== 'fixing' &&
              'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
          )}
        >
          <Header
            cell={cell}
            runCell={runCell}
            stopCell={stopCell}
            onDeleteCell={onDeleteCell}
            generate={generate}
            cellMode={cellMode}
            setCellMode={setCellMode}
            prompt={prompt}
            setPrompt={setPrompt}
            updateFilename={updateFilename}
            filenameError={filenameError}
            setFilenameError={setFilenameError}
            fullscreen={fullscreen}
            setFullscreen={setFullscreen}
            setShowStdio={setShowStdio}
            onAccept={onAcceptDiff}
            onRevert={onRevertDiff}
            formatCell={formatCell}
          />

          {cellMode === 'reviewing' ? (
            <DiffEditor original={cell.source} modified={newSource} />
          ) : (
            <>
              <div className={cn(cellMode !== 'off' && 'opacity-50')} id={cell.filename}>
                <CodeEditor
                  channel={channel}
                  session={session}
                  cell={cell}
                  runCell={runCell}
                  formatCell={formatCell}
                  updateCellOnServer={updateCellOnServer}
                  readOnly={['generating', 'prompting', 'formatting'].includes(cellMode)}
                />
              </div>
              <CellOutput
                cell={cell}
                show={showStdio}
                setShow={setShowStdio}
                fixDiagnostics={aiFixDiagnostics}
                cellMode={cellMode}
                fullscreen={fullscreen}
                setFullscreen={setFullscreen}
              />
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
  onDeleteCell: (cell: CellType) => void;
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
  } = props;

  const { aiEnabled } = useSettings();
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
          <DeleteCellWithConfirmation onDeleteCell={() => onDeleteCell(cell)}>
            <Button className="hidden group-hover:flex" variant="icon" size="icon" tabIndex={1}>
              <Trash2 size={16} />
            </Button>
          </DeleteCellWithConfirmation>
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

function gotoDefinition(
  pos: number,
  cell: CodeCellType,
  session: SessionType,
  channel: SessionChannel,
  editor: (content: string) => void,
) {
  async function gotoDefCallback({ response }: TsServerDefinitionLocationResponsePayloadType) {
    channel.off('tsserver:cell:definition_location:response', gotoDefCallback);
    if (response === null) {
      console.log('no response');
      return;
    }
    const file_response = await getFileContent(response.file);
    if (file_response.result.type === 'cell') {
      document
        .getElementById(file_response.result.filename)
        ?.scrollIntoView({ behavior: 'smooth' });
    } else {
      if (file_response.error) {
        console.error('Error fetching file content:', file_response.result);
      } else {
        editor(file_response.result.content);
      }
    }
  }

  console.log({ location: mapCMLocationToTsServer(cell.source, pos) });
  channel.on('tsserver:cell:definition_location:response', gotoDefCallback);
  channel.push('tsserver:cell:definition_location:request', {
    sessionId: session.id,
    cellId: cell.id,
    request: { location: mapCMLocationToTsServer(cell.source, pos) },
  });
}

function CodeEditor({
  channel,
  cell,
  session,
  runCell,
  formatCell,
  updateCellOnServer,
  readOnly,
}: {
  channel: SessionChannel;
  cell: CodeCellType;
  session: SessionType;
  runCell: () => void;
  formatCell: () => void;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  readOnly: boolean;
}) {
  const { theme, codeTheme } = useTheme();

  const {
    updateCell: updateCellOnClient,
    getTsServerDiagnostics,
    getTsServerSuggestions,
  } = useCells();

  const updateCellOnServerDebounced = useDebouncedCallback(updateCellOnServer, DEBOUNCE_DELAY);

  function evaluateModEnter() {
    runCell();
    return true;
  }

  const extensions = [
    javascript({ typescript: true }),
    tsHover(session.id, cell, channel, theme),
    tsLinter(cell, getTsServerDiagnostics, getTsServerSuggestions),
    autocompletion({ override: [(context) => getCompletions(context, session.id, cell, channel)] }),
    Prec.highest(
      EditorView.domEventHandlers({
        click: (e, view) => {
          const pos = view.posAtCoords({ x: e.clientX, y: e.clientY });
          if (pos && e.altKey) {
            gotoDefinition(pos, cell, session, channel, openModal);
          }
        },
      }),
    ),
    Prec.highest(
      keymap.of([
        { key: 'Mod-Enter', run: evaluateModEnter },
        {
          key: 'Shift-Alt-f',
          run: () => {
            formatCell();
            return true;
          },
        },
      ]),
    ),
  ];

  if (readOnly) {
    extensions.push(EditorView.editable.of(false));
    extensions.push(EditorState.readOnly.of(true));
  }
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalContent, setModalContent] = useState('');

  const openModal = (content: string) => {
    setModalContent(content);
    setIsModalOpen(true);
  };

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
