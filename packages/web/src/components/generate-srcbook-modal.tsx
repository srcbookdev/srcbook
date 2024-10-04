import { useState } from 'react';
import { useHotkeys } from 'react-hotkeys-hook';
import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { Button } from '@srcbook/components/src/components/ui/button';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';
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
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading'>('idle');
  const [error, setError] = useState<'generic' | 'api_key' | null>(null);
  const { aiEnabled } = useSettings();

  useHotkeys(
    'mod+enter',
    () => {
      if (!open) return;
      generate();
    },
    { enableOnFormTags: ['textarea'] },
  );

  const generate = async () => {
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
      if (/Incorrect API key provided/.test(result)) {
        setError('api_key');
      } else {
        setError('generic');
      }
    } else {
      openSrcbook(result.dir);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn('flex flex-col transition-height w-[800px]')}>
        <DialogHeader>
          <DialogTitle>Generate with AI</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-3">
          {!aiEnabled && <APIKeyWarning />}
          <Textarea
            placeholder="Write a prompt to create a Srcbook..."
            className="focus-visible:ring-2"
            rows={4}
            value={query}
            disabled={!aiEnabled || status === 'loading'}
            onChange={(e) => setQuery(e.target.value)}
          />
          <Button
            className="self-end flex items-center gap-2"
            disabled={!query || status === 'loading'}
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
          {error !== null && <ErrorMessage type={error} onRetry={generate} />}
          <div className="border-t">
            <p className="py-3 font-bold">Examples</p>
            {EXAMPLES.map((example) => (
              <button
                onClick={() => setQuery(example)}
                className="flex items-center justify-center gap-6 cursor-pointer hover:bg-muted rounded px-1.5 py-2"
                key={JSON.stringify(example)}
              >
                <Sparkles size={16} className="shrink-0" />
                <p className="text-sm text-left">{example}</p>
              </button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function APIKeyWarning() {
  return (
    <div className="flex items-center justify-between bg-sb-yellow-20 text-sb-yellow-80 rounded-sm text-sm font-medium px-3 py-2">
      <p>AI provider not configured.</p>
      <Link to="/settings" className="underline">
        Settings
      </Link>
    </div>
  );
}

function ErrorMessage({ type, onRetry }: { type: 'api_key' | 'generic'; onRetry: () => void }) {
  return (
    <div className="bg-error text-error-foreground rounded-sm text-sm font-medium px-3 py-2">
      {type === 'api_key' ? <APIKeyError /> : <GenericError onRetry={onRetry} />}
    </div>
  );
}

function APIKeyError() {
  return (
    <div className="flex items-center justify-between">
      <p>Invalid API key</p>
      <Link to="/settings" className="underline">
        Settings
      </Link>
    </div>
  );
}

function GenericError(props: { onRetry: () => void }) {
  return (
    <div className="flex items-center justify-between">
      <p>Something went wrong</p>
      <button onClick={props.onRetry} className="underline">
        Try again
      </button>
    </div>
  );
}
