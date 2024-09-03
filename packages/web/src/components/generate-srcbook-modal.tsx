import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Link } from 'react-router-dom';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { generateSrcbook } from '@/lib/server';
import { useSettings } from '@/components/use-settings';

const EXAMPLES = [
  'Cover the basics of validating data in TypeScript using Zod, including how to infer types from schemas',
  'Create an AI agent in Node.js that browses the web and answers questions using langchain',
  'Implement breadth-first-search and depth-first-search using TypeScript',
];

export default function GenerateSrcbookModal({
  open,
  setOpen,
  openSrcbook,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  openSrcbook: (path: string) => void;
}): JSX.Element {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<'generic' | 'api_key' | null>(null);
  const { aiEnabled } = useSettings();

  useHotkeys(
    'mod+enter',
    () => {
      if (!open) return;
      void (async () => {
        await generate();
      })();
    },
    { enableOnFormTags: ['textarea'] },
  );

  const generate = async (): Promise<void> => {
    if (!query) {
      return;
    }

    setError(null);
    setStatus('loading');

    // Some errors will be handled by the API handler and return with
    // {error: true, result: {message: string}}}
    // Some example errors that we expect are:
    //  - the generated text from the LLM did not parse correctly into Srcbook format
    //  - the API key is invalid
    //  - rate limits or out-of-credits issues
    const { result, error } = await generateSrcbook({ query });

    if (error) {
      console.error(result);
      setStatus('idle');
      if (result.includes('Incorrect API key provided')) {
        setError('api_key');
      } else {
        setError('generic');
      }
    } else {
      openSrcbook(result.dir);
    }
  };

  return (
    <Dialog onOpenChange={setOpen} open={open}>
      <DialogContent className={cn('flex flex-col transition-height w-[800px]')}>
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {!aiEnabled && <APIKeyWarning />}
          <Textarea
            className="focus-visible:ring-2"
            disabled={!aiEnabled || status === 'loading'}
            onChange={(e) => {
              setQuery(e.target.value);
            }}
            placeholder="Write a prompt to create a Srcbook..."
            rows={4}
            value={query}
          />
          <Button
            className="w-fit self-end flex items-center gap-2"
            disabled={!query || status === 'loading'}
            onClick={() => {
              void (async () => {
                await generate();
              })();
            }}
          >
            {status === 'loading' ? (
              <>
                <Loader2 className="animate-spin" size={20} /> <p>Generating</p>
              </>
            ) : (
              <p>Generate</p>
            )}
          </Button>
          {error !== null && (
            <ErrorMessage
              onRetry={() => {
                void (async () => {
                  await generate();
                })();
              }}
              type={error}
            />
          )}
          <div className="w-full border-t" />
          <p className="font-bold">Examples</p>
          {EXAMPLES.map((example) => (
            <div
              aria-label="Select example"
              className="flex w-full items-center justify-center gap-6 cursor-pointer hover:bg-muted rounded px-1.5 py-1"
              key={JSON.stringify(example)}
              onClick={() => {
                setQuery(example);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  setQuery(example);
                }
              }}
              role="button"
              tabIndex={0}
            >
              <Sparkles className="shrink-0" size={16} />
              <p className="grow text-sm">{example}</p>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function APIKeyWarning(): JSX.Element {
  return (
    <div className="flex items-center justify-between bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
      <p>Set up an AI provider to start using AI features.</p>
      <Link className="underline" to="/settings">
        Settings
      </Link>
    </div>
  );
}

function ErrorMessage({
  type,
  onRetry,
}: {
  type: 'api_key' | 'generic';
  onRetry: () => void;
}): JSX.Element {
  return (
    <div className="bg-error text-error-foreground rounded-sm text-sm font-medium px-3 py-2">
      {type === 'api_key' ? <APIKeyError /> : <GenericError onRetry={onRetry} />}
    </div>
  );
}

function APIKeyError(): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <p>Invalid API key</p>
      <Link className="underline" to="/settings">
        Settings
      </Link>
    </div>
  );
}

function GenericError(props: { onRetry: () => void }): JSX.Element {
  return (
    <div className="flex items-center justify-between">
      <p>Something went wrong</p>
      <button className="underline" onClick={props.onRetry} type="button">
        Try again
      </button>
    </div>
  );
}
