import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Circle, Info, Play, Trash2, Sparkles, X, MessageCircleWarning } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import AiGenerateTipsDialog from '@/components/ai-generate-tips-dialog';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  CellErrorPayloadType,
  AiGeneratedCellPayloadType,
} from '@srcbook/shared';
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

export default function CodeCell(props: {
  session: SessionType;
  cell: CodeCellType;
  channel: SessionChannel;
  onUpdateCell: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => Promise<string | null>;
  onDeleteCell: (cell: CellType) => void;
}) {
  const { session, cell, channel, onUpdateCell, onDeleteCell } = props;
  const [filenameError, _setFilenameError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);
  const [promptMode, setPromptMode] = useState<'off' | 'generating' | 'reviewing' | 'idle'>('off');
  const [prompt, setPrompt] = useState('');
  const [newSource, setNewSource] = useState('');

  useHotkeys(
    'mod+enter',
    () => {
      if (!prompt) return;
      if (promptMode !== 'idle') return;
      generate();
    },
    { enableOnFormTags: ['textarea'] },
  );

  const { updateCell, clearOutput } = useCells();

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
    updateCell({ ...cell, filename });
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
      setPromptMode('reviewing');
    }
    channel.on('ai:generated', callback);
    return () => channel.off('ai:generated', callback);
  }, [cell.id, channel]);

  const generate = () => {
    channel.push('ai:generate', {
      sessionId: session.id,
      cellId: cell.id,
      prompt,
    });
    setPromptMode('generating');
  };

  function runCell() {
    if (cell.status === 'running') {
      return false;
    }

    setShowStdio(true);

    // Update client side only. The server will know it's running from the 'cell:exec' event.
    updateCell({ ...cell, status: 'running' });
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
    setPromptMode('idle');
    setNewSource('');
  }

  async function onAcceptDiff() {
    await onUpdateCell(cell, { source: newSource });
    setPrompt('');
    setPromptMode('off');
  }

  return (
    <div className="relative group/cell" id={`cell-${props.cell.id}`}>
      <div
        className={cn(
          'border rounded-md group',
          cell.status === 'running' || promptMode === 'generating'
            ? 'ring-1 ring-run-ring border-run-ring'
            : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        )}
      >
        <div className="p-1 flex items-center justify-between gap-2">
          <div className={cn('flex items-center gap-1', promptMode !== 'off' && 'opacity-50')}>
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

              cell.status === 'running' ? 'opacity-100' : '',
            )}
          >
            <Button
              variant="icon"
              size="icon"
              disabled={promptMode !== 'off'}
              onClick={() => setPromptMode('idle')}
              tabIndex={1}
            >
              <Sparkles size={16} />
            </Button>
            {promptMode === 'idle' && (
              <Button variant="default" onClick={generate} tabIndex={1}>
                Generate
              </Button>
            )}
            {promptMode === 'generating' && (
              <Button variant="run" className="disabled:opacity-100" disabled tabIndex={1}>
                Generating
              </Button>
            )}
            {promptMode === 'off' && (
              <>
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
              </>
            )}
          </div>
        </div>
        {promptMode !== 'off' && (
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
                  setPromptMode('off');
                  setPrompt('');
                }}
              >
                <X size={16} />
              </Button>
            </div>
          </div>
        )}

        {promptMode === 'reviewing' ? (
          <DiffEditor
            original={cell.source}
            modified={newSource}
            onAccept={onAcceptDiff}
            onRevert={onRevertDiff}
          />
        ) : (
          <>
            <div className={cn(promptMode !== 'off' && 'opacity-50')}>
              <CodeEditor
                cell={cell}
                runCell={runCell}
                onUpdateCell={onUpdateCell}
                readOnly={['generating', 'idle'].includes(promptMode)}
              />
            </div>
            <CellOutput cell={cell} show={showStdio} setShow={setShowStdio} />
          </>
        )}
      </div>
    </div>
  );
}

function CodeEditor({
  cell,
  runCell,
  onUpdateCell,
  readOnly,
}: {
  cell: CodeCellType;
  runCell: () => void;
  onUpdateCell: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => Promise<string | null>;
  readOnly: boolean;
}) {
  const { codeTheme } = useTheme();
  const { updateCell: updateCellClientSideOnly } = useCells();

  const onUpdateCellDebounced = useDebouncedCallback(onUpdateCell, DEBOUNCE_DELAY);

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
        updateCellClientSideOnly({ ...cell, source });
        onUpdateCellDebounced(cell, { source });
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
          }),
        ]}
      />
      <div className="absolute bottom-0 right-0 flex items-center m-1.5 gap-1.5">
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
