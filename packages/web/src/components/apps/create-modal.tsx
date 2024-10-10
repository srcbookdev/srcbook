import { useState } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@srcbook/components/src/components/ui/input';
import { Button } from '@srcbook/components/src/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@srcbook/components/src/components/ui/dialog';

import { HelpCircle, Sparkles, Loader2 } from 'lucide-react';
import { CodeLanguageType } from '@srcbook/shared';
import { JavaScriptLogo, TypeScriptLogo } from '../logos';
import { Textarea } from '@srcbook/components/src/components/ui/textarea';
import {
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  Tooltip,
} from '@srcbook/components/src/components/ui/tooltip';

type PropsType = {
  onClose: () => void;
  onCreate: (name: string, language: CodeLanguageType, prompt?: string) => Promise<void>;
};

export default function CreateAppModal({ onClose, onCreate }: PropsType) {
  const [name, setName] = useState('');
  const [prompt, setPrompt] = useState('');
  const [language, setLanguage] = useState<CodeLanguageType>('typescript');

  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    e.stopPropagation();

    if (submitting) {
      return;
    }

    setSubmitting(true);

    try {
      await onCreate(name, language, prompt.trim() === '' ? undefined : prompt);
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
          <DialogDescription className="text-base">
            Create a React app powered by Vite and Tailwind.
          </DialogDescription>
        </DialogHeader>
        <form name="app" onSubmit={onSubmit} className="mt-3 flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-6">
            <LanguageSelector
              id="app-language-typescript"
              name="app[language]"
              value="typescript"
              selected={language === 'typescript'}
              onSelect={() => setLanguage('typescript')}
              className="font-mono text-sm"
            >
              <TypeScriptLogo className="mb-2" />
              TypeScript
            </LanguageSelector>
            <LanguageSelector
              id="app-language-javascript"
              name="app[language]"
              value="javascript"
              selected={language === 'javascript'}
              onSelect={() => setLanguage('javascript')}
              className="font-mono text-sm"
            >
              <JavaScriptLogo className="mb-2" />
              JavaScript
            </LanguageSelector>
          </div>

          <div className="space-y-1">
            <label htmlFor="name" className="text-sm text-tertiary-foreground">
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
                className="text-sm text-tertiary-foreground flex items-center gap-1.5"
              >
                What are you building? <Sparkles size={16} />
              </label>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <HelpCircle size={16} className="text-tertiary-foreground" />
                  </TooltipTrigger>
                  <TooltipContent className="text-sm" side="left">
                    Optionally use AI to scaffold your app
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

            <Button disabled={submitting} type="submit">
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

function LanguageSelector(props: {
  id: string;
  name: string;
  value: CodeLanguageType;
  selected: boolean;
  onSelect: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      htmlFor={props.id}
      className={cn(
        'flex flex-col items-center justify-center w-full min-w-[216px] max-w-[216px] h-24 p-3 cursor-pointer',
        'bg-background text-tertiary-foreground hover:text-foreground border rounded-sm hover:border-ring transition-colors',
        props.selected && 'border-ring text-foreground',
        props.className,
      )}
    >
      <input
        type="radio"
        id={props.id}
        name={props.name}
        value={props.value}
        checked={props.selected}
        onChange={props.onSelect}
        className="hidden"
      />
      {props.children}
    </label>
  );
}
