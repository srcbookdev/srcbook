import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const EXAMPLES = [
  'Cover the basics of using Prisma, the popular TypeScript database ORM, with example code',
  'Create an AI agent that browses the web and answers questions using langchain',
  'Implement breadth-first-search and depth-first-search using TypeScript',
];

export default function GenerateSrcbookModal({
  open,
  setOpen,
  onGenerate,
  hasOpenaiKey,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onGenerate: (query: string) => Promise<void | string>;
  hasOpenaiKey: boolean;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState('');

  const navigate = useNavigate();

  const generate = async () => {
    setStatus('loading');
    const result = await onGenerate(query);
    if (result) {
      console.error(result);
      setError(result);
      setStatus('idle');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn('flex flex-col transition-height w-[800px]')}>
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          <Textarea
            placeholder="Write a prompt to create a Srcbook..."
            className="focus-visible:ring-2"
            rows={4}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            className="w-fit self-end flex items-center gap-2"
            disabled={!query}
            onClick={generate}
          >
            {status === 'loading' ? (
              <>
                <Loader2 size={20} className="animate-spin" /> <p>Generating</p>
              </>
            ) : (
              <p>Generate</p>
            )}
          </Button>
          {error.length > 0 && (
            <div className="bg-sb-red-30 text-sb-red-80 rounded-sm text-sm px-3 py-2">
              Something went wrong, please try again.
            </div>
          )}
          {!hasOpenaiKey && (
            <div className="flex w-full items-center justify-between bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm p-1">
              <p className="px-2">API key required</p>
              <button
                className="border border-sb-yellow-70 rounded-sm px-2 py-1 hover:border-sb-yellow-80 animate-all"
                onClick={() => navigate('/settings')}
              >
                Settings
              </button>
            </div>
          )}
          <div className="w-full border-t"></div>
          <p className="font-bold">Examples</p>
          {EXAMPLES.map((example) => (
            <div
              onClick={() => setQuery(example)}
              className="flex w-full items-center justify-center gap-6 cursor-pointer hover:bg-muted rounded px-1.5 py-1"
              key={JSON.stringify(example)}
            >
              <Sparkles size={16} className="shrink-0" />
              <p className="grow text-sm">{example}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
