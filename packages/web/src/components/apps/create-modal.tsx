import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@srcbook/components/src/components/ui/input';
import { Button } from '@srcbook/components/src/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';

import { HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
} from '@srcbook/components/src/components/ui/tooltip';
import { useSettings } from '../use-settings';

type PropsType = {
  onClose: () => void;
  onCreate: (name: string, prompt?: string) => Promise<void>;
};

export default function CreateAppModal({ onClose, onCreate }: PropsType) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');

  const { aiEnabled } = useSettings();
  const navigate = useNavigate();

  const [submitting, setSubmitting] = useState(false);

  const validPrompt = prompt.trim() !== '';

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (submitting || !validPrompt) {
      return;
    }

    setSubmitting(true);

    try {
      await onCreate(name, prompt.trim() === '' ? undefined : prompt);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (open === false) {
          onClose();
        }
      }}
    >
      <DialogContent className={cn('flex flex-col transition-height w-[800px]')}>
        <DialogHeader>
          <DialogTitle>Create application</DialogTitle>
          <DialogDescription className="text-sm">
            Create a web app powered by React, Vite and Tailwind.
          </DialogDescription>

          {!aiEnabled && (
            <div className="flex items-center justify-between bg-warning text-warning-foreground rounded-sm text-sm px-3 py-1 mt-4">
              <p>AI provider not configured.</p>
              <button
                className="font-medium underline cursor-pointer"
                onClick={() => navigate('/settings')}
              >
                Settings
              </button>
            </div>
          )}
        </DialogHeader>
        <form name="app" onSubmit={onSubmit} className="flex flex-col gap-6">
          <div className="space-y-1">
            <label htmlFor="name" className="text-sm font-medium text-tertiary-foreground">
              App name
            </label>
            <Input
              name="app[name]"
              value={name}
              /* eslint-disable-next-line jsx-a11y/no-autofocus */
              autoFocus
              autoComplete="off"
              onChange={(e) => setName(e.currentTarget.value)}
              placeholder="Spotify Light"
            />
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-center">
              <label
                htmlFor="name"
                className="text-sm text-tertiary-foreground font-medium flex items-center gap-1.5"
              >
                What are you building? <Sparkles size={14} />
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-tertiary-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="text-sm" side="left">
                    Use AI to scaffold your app
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <Textarea
              name="app[prompt]"
              value={prompt}
              onChange={(e) => setPrompt(e.currentTarget.value)}
              className="h-20"
              placeholder="A Spotify-like app, showcasing a user's favorite playlists and most listened to songs."
            ></Textarea>
          </div>

          <DialogFooter>
            <Button type="button" variant="secondary" onClick={onClose}>
              Cancel
            </Button>

            <Button disabled={!aiEnabled || submitting || !validPrompt} type="submit">
              {submitting ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Generating...
                </div>
              ) : (
                'Create'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
