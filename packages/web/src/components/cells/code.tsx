import { useEffect, useRef, useState } from 'react';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { javascript } from '@codemirror/lang-javascript';
import { Circle, Play, Trash2 } from 'lucide-react';
import {
  CellType,
  CodeCellType,
  CodeCellUpdateAttrsType,
  CellErrorPayloadType,
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
  const [error, setError] = useState<string | null>(null);
  const [showStdio, setShowStdio] = useState(false);

  const { updateCell, clearOutput } = useCells();

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

  function updateFilename(filename: string) {
    onUpdateCell(cell, { filename });
  }

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
          <div className="flex items-center gap-2 w-[200px]">
            <FilenameInput
              filename={cell.filename}
              onUpdate={updateFilename}
              onChange={() => setError(null)}
              className="font-mono font-semibold text-xs border-transparent hover:border-input transition-colors group-hover:border-input"
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
        <CodeEditor cell={cell} runCell={runCell} onUpdateCell={onUpdateCell} />
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
