import { useState } from 'react';
import { type CodeCellType, type MarkdownCellType } from '@srcbook/shared';
import { generateCell } from '@/lib/server';
import { CircleAlert, Trash2, Sparkles } from 'lucide-react';
import { GenerateAICellType, SessionType } from '@/types';
import { useCells } from '@/components/use-cell';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import DeleteCellWithConfirmation from '@/components/delete-cell-dialog';

export default function GenerateAiCell(props: {
  cell: GenerateAICellType;
  insertIdx: number;
  session: SessionType;
  onSuccess: (idx: number, cell: CodeCellType | MarkdownCellType) => void;
}) {
  const { cell, insertIdx, session, onSuccess } = props;
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const { removeCell } = useCells();
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const generate = async () => {
    setError(null);
    setState('loading');
    const { result, error } = await generateCell(session.id, {
      query: prompt,
      insertIdx: insertIdx,
    });
    setState('idle');
    if (error) {
      setError(result);
    } else {
      // We have successfully converted a prompt into a valid cell.
      // Create the new markdown | code cell, then cleanup the current temporary one.
      onSuccess(insertIdx, result);
      removeCell(cell);
    }
  };

  return (
    <div
      id={`cell-${cell.id}`}
      className={cn(
        'group/cell relative w-full rounded-md border border-border transition-all',
        state === 'loading'
          ? 'ring-1 ring-run-ring border-run-ring'
          : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        error &&
          'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30 focus-within:border-sb-red-30 focus-within:ring-sb-red-30',
      )}
    >
      {error && (
        <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
          <CircleAlert size={16} />
          <p className="text-xs">{error}</p>
        </div>
      )}
      <div className="flex flex-col">
        <div className="p-1 w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h5 className="pl-4 text-sm font-mono font-bold">Generate with AI</h5>
            <DeleteCellWithConfirmation onDeleteCell={() => removeCell(cell)}>
              <Button
                variant="secondary"
                size="icon"
                className="border-secondary hover:border-muted"
              >
                <Trash2 size={16} />
              </Button>
            </DeleteCellWithConfirmation>
          </div>

          <div>
            <Button
              disabled={!prompt}
              onClick={generate}
              variant={state === 'idle' ? 'default' : 'run'}
            >
              {state === 'idle' ? 'Generate' : 'Generating'}
            </Button>
          </div>
        </div>

        <div className="flex items-start">
          <Sparkles size={16} className="m-2.5" />

          <textarea
            value={prompt}
            autoFocus
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write a prompt..."
            className="flex min-h-[60px] w-full rounded-sm px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none pl-0"
          />
        </div>
      </div>
    </div>
  );
}
