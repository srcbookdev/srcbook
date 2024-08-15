import { useEffect, useState } from 'react';
import { useSettings } from '@/components/use-settings';
import { useNavigate } from 'react-router-dom';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SessionType } from '@/types';
import { TitleCellType, TsConfigUpdatedPayloadType } from '@srcbook/shared';
import { useCells } from './use-cell';
import { ChevronRight, X, Info, LoaderCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import useTheme from './use-theme';
import { SessionChannel } from '@/clients/websocket';
import { Button } from './ui/button';
import { usePackageJson } from './use-package-json';
import { useTsconfigJson } from './use-tsconfig-json';

type PropsType = {
  session: SessionType;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  openDepsInstallModal: () => void;
  channel: SessionChannel;
};

export function SettingsSheet({
  session,
  open,
  onOpenChange,
  openDepsInstallModal,
  channel,
}: PropsType) {
  const { aiEnabled } = useSettings();
  const { cells } = useCells();
  const navigate = useNavigate();
  const [showAiNudge, setShowAiNudge] = useState(!aiEnabled);
  console.log('aiEnabled', aiEnabled);

  const title = cells.find((cell) => cell.type === 'title') as TitleCellType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="pt-12">
        <SheetHeader>
          {showAiNudge && (
            <div className="relative flex flex-col px-3 py-3.5 border border-ai-border bg-ai text-ai-foreground rounded-sm text-sm">
              <div
                className="absolute top-2 right-2 cursor-pointer text-sb-purple-60"
                onClick={() => setShowAiNudge(false)}
              >
                <X size={16} />
              </div>
              <h2 className="font-bold">Use AI in Srcbook</h2>
              <p>
                AI features not enabled. To enable them, set up in{' '}
                <a
                  className="font-medium underline cursor-pointer"
                  onClick={() => navigate('/settings')}
                >
                  {' '}
                  global settings
                </a>
                .
              </p>
            </div>
          )}
          <SheetTitle className="font-bold">Settings</SheetTitle>
        </SheetHeader>
        <div className="text-foreground mt-2 space-y-6">
          <div className="flex items-center justify-between gap-8 text-sm">
            <h5 className="font-medium max-w-72 truncate">{title.text}</h5>
            <p className="text-tertiary-foreground">
              {session.language === 'typescript' ? 'TypeScript' : 'JavaScript'}
            </p>
          </div>
          <PackageJson openDepsInstallModal={openDepsInstallModal} />
          {session.language === 'typescript' && <TsconfigJson channel={channel} />}
        </div>
      </SheetContent>
    </Sheet>
  );
}

function PackageJson({ openDepsInstallModal }: { openDepsInstallModal: () => void }) {
  const { codeTheme } = useTheme();
  const { source, onChangeSource, validationError, npmInstall, installing } = usePackageJson();

  const [open, setOpen] = useState(true);

  function evaluateModEnter() {
    npmInstall();
    return true;
  }

  return (
    <div>
      <CollapsibleContainer
        open={open}
        setOpen={setOpen}
        title="package.json"
        className={cn({
          'border-error': validationError !== null,
          'border-run': installing,
        })}
      >
        <div className="pt-1 pb-3 px-3">
          <CodeMirror
            value={source}
            theme={codeTheme}
            extensions={[
              json(),
              Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
            ]}
            onChange={onChangeSource}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
          />
        </div>
        {validationError !== null && <Error error={validationError} />}
      </CollapsibleContainer>
      {open && (
        <div className="flex justify-end items-center gap-2 pt-1">
          <Button variant="secondary" onClick={openDepsInstallModal}>
            Add package
          </Button>
          {installing ? (
            <Button variant="run" size="default-with-icon" disabled>
              <LoaderCircle size={16} className="animate-spin" />
              Installing
            </Button>
          ) : (
            <Button
              size="default-with-icon"
              onClick={() => npmInstall()}
              disabled={installing || validationError !== null}
              className="font-mono"
            >
              <Play size={16} />
              npm install
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

function TsconfigJson({ channel }: { channel: SessionChannel }) {
  const { codeTheme } = useTheme();
  const { source, onChangeSource, validationError } = useTsconfigJson();
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!channel) return;
    const callback = (_payload: TsConfigUpdatedPayloadType) => {
      setSaved(true);
      setTimeout(() => setSaved(false), 20000);
    };

    channel.on('tsconfig.json:updated', callback);

    return () => channel.off('tsconfig.json:updated', callback);
  }, [channel, setSaved]);

  return (
    <div>
      <CollapsibleContainer
        open={open}
        setOpen={setOpen}
        title="tsconfig.json"
        className={cn({ 'border-error': validationError !== null })}
      >
        <div className="pt-1 pb-3 px-3 relative">
          <CodeMirror
            value={source}
            theme={codeTheme}
            extensions={[json()]}
            onChange={onChangeSource}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
          />
          {saved && <p className="absolute right-1 bottom-1 text-xs text-foreground/80">Saved!</p>}
        </div>
        {validationError !== null && <Error error={validationError} />}
      </CollapsibleContainer>
    </div>
  );
}

function Error(props: { error: string | null }) {
  return (
    <div className="px-1.5 pb-1.5">
      <div className="bg-error text-error-foreground text-sm font-medium py-2 pl-[10px] pr-3 flex items-start gap-1.5 rounded-sm">
        <div className="shrink-0 mt-0.5">
          <Info size={16} />
        </div>
        <p>{props.error}</p>
      </div>
    </div>
  );
}

function CollapsibleContainer(props: {
  open: boolean;
  setOpen: (value: boolean) => void;
  title: string;
  className?: string | null;
  children: React.ReactNode;
}) {
  const { open, setOpen, title, children } = props;

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <div className={cn('w-full border rounded-sm', props.className)}>
        <CollapsibleTrigger className="block w-full">
          <div className="p-3 flex items-center justify-between">
            <h5 className="font-bold leading-none">{title}</h5>
            <ChevronRight
              className={cn('w-4 h-4 transition-transform text-tertiary-foreground', {
                'transform rotate-90': open,
              })}
            />
          </div>
        </CollapsibleTrigger>
        <CollapsibleContent>{children}</CollapsibleContent>
      </div>
    </Collapsible>
  );
}
