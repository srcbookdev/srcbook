import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useHotkeys } from 'react-hotkeys-hook';
import { type CodeCellType, type MarkdownCellType } from '@srcbook/shared';
import { generateCells } from '@/lib/server';
import { CircleAlert, Trash2, Sparkles } from 'lucide-react';
import { GenerateAICellType, SessionType } from '@/types';
import { useCells } from '@/components/use-cell';
import { cn } from '@/lib/utils';
import { Button } from '@srcbook/ui/dist/components/ui/button';
import { useSettings } from '@/components/use-settings';

export default function GenerateAiCell(props: {
  cell: GenerateAICellType;
  insertIdx: number;
  session: SessionType;
  onSuccess: (idx: number, cells: Array<CodeCellType | MarkdownCellType>) => void;
}) {
  const { cell, insertIdx, session, onSuccess } = props;
  const [state, setState] = useState<'idle' | 'loading'>('idle');
  const { removeCell } = useCells();
  const [prompt, setPrompt] = useState('');
  const [error, setError] = useState<string | null>(null);

  const { aiEnabled } = useSettings();

  const navigate = useNavigate();
  useHotkeys(
    'mod+enter',
    () => {
      if (!prompt) return;
      generate();
    },
    { enableOnFormTags: ['textarea'] },
  );

  const generate = async () => {
    setError(null);
    setState('loading');
    const { result, error } = await generateCells(session.id, {
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
          ? 'ring-1 ring-ai-ring border-ai-ring'
          : 'focus-within:ring-1 focus-within:ring-ring focus-within:border-ring',
        error &&
          'ring-1 ring-sb-red-30 border-sb-red-30 hover:border-sb-red-30 focus-within:border-sb-red-30 focus-within:ring-sb-red-30',
      )}
    >
      <div className="flex flex-col">
        <div className="p-1 w-full flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <h5 className="pl-4 text-sm font-mono font-bold">Generate with AI</h5>
            <Button
              variant="secondary"
              size="icon"
              className="border-secondary hover:border-muted"
              onClick={() => removeCell(cell)}
            >
              <Trash2 size={16} />
            </Button>
          </div>

          <div>
            <Button
              disabled={!prompt || !aiEnabled}
              onClick={generate}
              variant={state === 'idle' ? 'default' : 'ai'}
            >
              {state === 'idle' ? 'Generate' : 'Generating'}
            </Button>
          </div>
        </div>

        <div className={cn('flex items-start', error && 'border-b')}>
          <Sparkles size={16} className="m-2.5" />

          <textarea
            value={prompt}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- needed for action flow
            autoFocus
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Write a prompt..."
            className="flex min-h-[80px] bg-transparent w-full rounded-sm px-3 py-2 text-sm placeholder:text-muted-foreground focus-visible:outline-none pl-0"
          />
        </div>

        {error && (
          <div className="flex items-center gap-2 m-2 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm justify-center">
            <CircleAlert size={16} />
            <p className="text-xs line-clamp-1 ">{error}</p>
          </div>
        )}

        {!aiEnabled && (
          <div className="flex items-center justify-between bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm px-3 py-1 m-3">
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
    </div>
  );
}
