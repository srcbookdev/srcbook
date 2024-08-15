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
  AiGeneratedCellPayloadType,
} from '@srcbook/shared';
import { useSettings } from '@/components/use-settings';
import { cn } from '@/lib/utils';
import { SessionType } from '@/types';
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

const DEBOUNCE_DELAY = 500;
type CellModeType = 'off' | 'generating' | 'reviewing' | 'prompting' | 'fixing';

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
    }

    channel.on('cell:error', callback);

    return () => channel.off('cell:error', callback);
  }, [cell.id, channel]);

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

  return (
    <div id={`cell-${props.cell.id}`}>
      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent
          className={cn(
            `w-[95vw] h-[95vh] max-w-none p-0 group flex flex-col`,
            cell.status === 'running'
              ? 'ring-1 ring-run-ring border-run-ring'
              : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
            (cellMode === 'generating' || cellMode === 'fixing') &&
              'ring-1 ring-ai-ring border-ai-ring',
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
          />

          {cellMode === 'reviewing' ? (
            <DiffEditor
              original={cell.source}
              modified={newSource}
              onAccept={onAcceptDiff}
              onRevert={onRevertDiff}
            />
          ) : (
            <ResizablePanelGroup direction="vertical">
              <ResizablePanel style={{ overflow: 'scroll' }} defaultSize={60}>
                <div className={cn(cellMode !== 'off' && 'opacity-50')}>
                  <CodeEditor
                    cell={cell}
                    runCell={runCell}
                    updateCellOnServer={updateCellOnServer}
                    readOnly={['generating', 'prompting', 'fixing'].includes(cellMode)}
                  />
                </div>
              </ResizablePanel>

              <ResizableHandle withHandle className="border-none" />
              <ResizablePanel defaultSize={40} style={{ overflow: 'scroll' }}>
                <CellOutput
                  cell={cell}
                  show={showStdio}
                  setShow={setShowStdio}
                  fullscreen
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
            cell.status === 'running'
              ? 'ring-1 ring-run-ring border-run-ring'
              : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
            (cellMode === 'generating' || cellMode === 'fixing') &&
              'ring-1 ring-ai-ring border-ai-ring',
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
          />

          {cellMode === 'reviewing' ? (
            <DiffEditor
              original={cell.source}
              modified={newSource}
              onAccept={onAcceptDiff}
              onRevert={onRevertDiff}
            />
          ) : (
            <>
              <div className={cn(cellMode !== 'off' && 'opacity-50')}>
                <CodeEditor
                  cell={cell}
                  runCell={runCell}
                  updateCellOnServer={updateCellOnServer}
                  readOnly={['generating', 'prompting'].includes(cellMode)}
                />
              </div>
              <CellOutput
                cell={cell}
                show={showStdio}
                setShow={setShowStdio}
                fixDiagnostics={aiFixDiagnostics}
                cellMode={cellMode}
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

            cell.status === 'running' || cellMode === 'fixing' || cellMode === 'generating'
              ? 'opacity-100'
              : '',
          )}
        >
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="icon"
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
          {cellMode === 'off' && (
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
                autoFocus
                placeholder="Ask the AI to edit this cell..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
              />
            </div>
            <div className="flex items-center gap-1.5">
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
              <p>API key required</p>
              <a
                className="font-medium underline cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                Settings
              </a>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function CodeEditor({
  cell,
  runCell,
  updateCellOnServer,
  readOnly,
}: {
  cell: CodeCellType;
  runCell: () => void;
  updateCellOnServer: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => void;
  readOnly: boolean;
}) {
  const { codeTheme } = useTheme();
  const { updateCell: updateCellOnClient } = useCells();

  const updateCellOnServerDebounced = useDebouncedCallback(updateCellOnServer, DEBOUNCE_DELAY);

  function evaluateModEnter() {
    runCell();
    return true;
  }

  let extensions = [
    javascript({ typescript: true }),
    Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
  ];
  if (readOnly) {
    extensions = extensions.concat([EditorView.editable.of(false), EditorState.readOnly.of(true)]);
  }

  return (
    <CodeMirror
      value={cell.source}
      theme={codeTheme}
      extensions={extensions}
      onChange={(source) => {
        updateCellOnClient({ ...cell, source });
        updateCellOnServerDebounced(cell, { source });
      }}
    />
  );
}

function DiffEditor({
  original,
  modified,
  onAccept,
  onRevert,
}: {
  original: string;
  modified: string;
  onAccept: () => void;
  onRevert: () => void;
}) {
  const { codeTheme } = useTheme();

  return (
    <div className="relative flex flex-col">
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
      <div className="absolute top-0 right-0 flex items-center m-1.5 gap-1.5">
        <Button variant="secondary" onClick={onRevert}>
          Revert
        </Button>
        <Button onClick={onAccept}>Accept</Button>
      </div>
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
