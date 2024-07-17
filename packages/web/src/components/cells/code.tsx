import { useEffect, useRef, useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Circle, Info, Play, Trash2, Sparkles, X } from 'lucide-react';
import TextareaAutosize from 'react-textarea-autosize';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  CellErrorPayloadType,
  CellAiGeneratedPayloadType,
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
  const [promptMode, setShowAiPrompt] = useState(false);
  const [prompt, setPrompt] = useState('');

  useHotkeys(
    'mod+enter',
    () => {
      if (!prompt) return;
      if (!promptMode) return;
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
    function callback(payload: CellAiGeneratedPayloadType) {
      if (payload.cellId !== cell.id) return;
      console.log('received output', payload.output);
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
    console.log('Asking the ai:', prompt);
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
          <div className={cn('flex items-center gap-1', promptMode && 'opacity-50')}>
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
              onClick={() => setShowAiPrompt(!promptMode)}
              tabIndex={1}
            >
              {promptMode ? <X size={16} /> : <Sparkles size={16} />}
            </Button>
            {promptMode ? (
              <Button variant="default" onClick={generate} tabIndex={1}>
                Generate
              </Button>
            ) : (
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
        {promptMode && (
          <div className="flex items-start">
            <Sparkles size={16} className="m-2.5" />
            <TextareaAutosize
              className="flex min-h-[60px] w-full rounded-sm bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none resize-none"
              autoFocus
              placeholder="Ask the AI to edit this cell..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
            />
          </div>
        )}

        <div className={cn(promptMode && 'opacity-50')}>
          <CodeEditor cell={cell} runCell={runCell} onUpdateCell={onUpdateCell} />
        </div>
        <CellOutput cell={cell} show={showStdio} setShow={setShowStdio} />
      </div>
    </div>
  );
}

function CodeEditor({
  cell,
  runCell,
  onUpdateCell,
}: {
  cell: CodeCellType;
  runCell: () => void;
  onUpdateCell: (cell: CodeCellType, attrs: CodeCellUpdateAttrsType) => Promise<string | null>;
}) {
  const { codeTheme } = useTheme();
  const { updateCell: updateCellClientSideOnly } = useCells();

  const onUpdateCellDebounced = useDebouncedCallback(onUpdateCell, DEBOUNCE_DELAY);

  function evaluateModEnter() {
    runCell();
    return true;
  }

  return (
    <CodeMirror
      value={cell.source}
      theme={codeTheme}
      extensions={[
        javascript({ typescript: true }),
        Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
      ]}
      onChange={(source) => {
        updateCellClientSideOnly({ ...cell, source });
        onUpdateCellDebounced(cell, { source });
      }}
    />
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
