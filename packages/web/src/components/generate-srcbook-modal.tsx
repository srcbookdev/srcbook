import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

type Status = 'idle' | 'loading' | 'success' | 'error';
export default function GenerateSrcbookModal({
  open,
  setOpen,
  onGenerate,
}: {
  open: boolean;
  setOpen: (open: boolean) => void;
  onGenerate: (query: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState<Status>('idle');

  const statusToTitle = (status: Status) => {
    switch (status) {
      case 'loading':
        return 'Generating...';
      case 'success':
        return 'Generated!';
      case 'error':
        return 'Error!';
      default:
        return 'Generate';
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className={cn('flex flex-col transition-height w-[800px]')}>
        <DialogHeader>
          <DialogTitle>{statusToTitle(status)}</DialogTitle>
          <DialogDescription id="npm-search-modal">
            Create a new srcbook using AI. Simply describe what you want.
          </DialogDescription>
        </DialogHeader>
        {status === 'idle' && (
          <div className="relative">
            <Input
              className="h-10 focus-visible:ring-2"
              placeholder="Write a prompt..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <Button
              className="absolute right-1 top-1 px-3 py-4 border-none "
              disabled={query.length === 0}
              size="sm"
              onClick={async () => {
                setStatus('loading');
                return onGenerate(query);
              }}
            >
              <Sparkles size={16} />
            </Button>
          </div>
        )}
        {status === 'loading' && (
          <div className="flex w-full h-full items-center justify-center gap-3">
            <Loader2 className="animate-spin" />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
