import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TitleCellType, TsConfigUpdatedPayloadType } from '@srcbook/shared';
import {
  ChevronRight,
  X,
  Info,
  LoaderCircle,
  Play,
  PanelBottomOpen,
  PanelBottomClose,
  CopyIcon,
  CheckIcon,
} from 'lucide-react';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { cn } from '@/lib/utils';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { OutputType, SessionType } from '@/types';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useSettings } from '@/components/use-settings';
import type { SessionChannel } from '@/clients/websocket';
import { useCells } from './use-cell';
import useTheme from './use-theme';
import { Button } from './ui/button';
import { usePackageJson } from './use-package-json';
import { useTsconfigJson } from './use-tsconfig-json';

interface PropsType {
  session: SessionType;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  openDepsInstallModal: () => void;
  channel: SessionChannel;
}

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

  const title = cells.find((cell) => cell.type === 'title') as TitleCellType;

  return (
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent className="pt-12 overflow-y-scroll" side="left">
        <SheetHeader>
          {showAiNudge ? <div className="relative flex flex-col px-3 py-3.5 border border-ai-border bg-ai text-ai-foreground rounded-sm text-sm">
              <div
                className="absolute top-2 right-2 cursor-pointer text-sb-purple-60"
                onClick={() => { setShowAiNudge(false); }}
              >
                <X size={16} />
              </div>
              <h2 className="font-bold">Use AI in Srcbook</h2>
              <p>
                AI features not enabled. To enable them, set up in{' '}
                <a
                  className="font-medium underline cursor-pointer"
                  onClick={() => { navigate('/settings'); }}
                >
                  {' '}
                  global settings
                </a>
                .
              </p>
            </div> : null}
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
  const { source, onChangeSource, validationError, npmInstall, installing, output, failed } =
    usePackageJson();

  const [open, setOpen] = useState(true);

  function evaluateModEnter() {
    npmInstall();
    return true;
  }

  const hasOutput = output.length > 0;

  return (
    <div>
      <CollapsibleContainer
        className={cn({ 'border-run': installing })}
        open={open}
        setOpen={setOpen}
        title="package.json"
      >
        <div className="pt-1 pb-3 px-3">
          <CodeMirror
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            extensions={[
              json(),
              Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
            ]}
            onChange={onChangeSource}
            theme={codeTheme}
            value={source}
          />
        </div>
        {validationError !== null && <Error error={validationError} />}
        {failed ? <Error error="Failed to install dependencies" /> : null}
        {hasOutput ? <OutputContainer output={output} /> : null}
      </CollapsibleContainer>
      {open ? <div className="flex justify-end items-center gap-2 pt-1">
          <Button onClick={openDepsInstallModal} variant="secondary">
            Add package
          </Button>
          {installing ? (
            <Button disabled size="default-with-icon" variant="run">
              <LoaderCircle className="animate-spin" size={16} />
              Installing
            </Button>
          ) : (
            <Button
              className="font-mono"
              disabled={installing || validationError !== null}
              onClick={() => { npmInstall(); }}
              size="default-with-icon"
            >
              <Play size={16} />
              npm install
            </Button>
          )}
        </div> : null}
    </div>
  );
}

function OutputContainer(props: { output: OutputType[] }) {
  const [show, setShow] = useState(true);
  const [copyIcon, setCopyIcon] = useState<'copy' | 'copied'>('copy');

  const output = props.output
    .map(({ data }) => data)
    .join('')
    .trim();

  function onCopy() {
    navigator.clipboard.writeText(output);
    setCopyIcon('copied');
    setTimeout(() => { setCopyIcon('copy'); }, 1500);
  }

  return (
    <div className="divide-y border-border font-mono text-sm">
      <div className="border-t border-border px-3 py-2 flex items-center justify-between bg-muted text-medium text-tertiary-foreground">
        <h5 className="leading-none">Logs</h5>
        <div className="flex items-center gap-6">
          <button
            className="hover:text-secondary-hover"
            disabled={copyIcon === 'copied'}
            onClick={onCopy}
          >
            {copyIcon === 'copy' ? <CopyIcon size={18} /> : <CheckIcon size={18} />}
          </button>
          <button className="hover:text-secondary-hover" onClick={() => { setShow(!show); }}>
            {show ? <PanelBottomOpen size={18} /> : <PanelBottomClose size={18} />}
          </button>
        </div>
      </div>
      {show ? <div className="p-3 overflow-scroll whitespace-pre text-[13px]">{output}</div> : null}
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
      setTimeout(() => { setSaved(false); }, 20000);
    };

    channel.on('tsconfig.json:updated', callback);

    return () => { channel.off('tsconfig.json:updated', callback); };
  }, [channel, setSaved]);

  return (
    <div>
      <CollapsibleContainer
        className={cn({ 'border-error': validationError !== null })}
        open={open}
        setOpen={setOpen}
        title="tsconfig.json"
      >
        <div className="pt-1 pb-3 px-3 relative">
          <CodeMirror
            basicSetup={{ lineNumbers: false, foldGutter: false }}
            extensions={[json()]}
            onChange={onChangeSource}
            theme={codeTheme}
            value={source}
          />
          {saved ? <p className="absolute right-1 bottom-1 text-xs text-foreground/80">Saved!</p> : null}
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
    <Collapsible onOpenChange={setOpen} open={open}>
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
