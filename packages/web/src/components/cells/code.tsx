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
            javascript({ typescript: true }),
            Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
          ]}
          onChange={onChangeSource}
        />
        <CellOutput cell={cell} show={showStdio} setShow={setShowStdio} />
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
