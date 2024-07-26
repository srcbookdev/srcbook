import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { SessionType } from '@/types';
import { TitleCellType } from '@srcbook/shared';
import { useCells } from './use-cell';
import { ChevronRight, Info, LoaderCircle, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import useTheme from './use-theme';
import { Button } from './ui/button';
import { usePackageJson } from './use-package-json';

type PropsType = {
  session: SessionType;
  open: boolean;
  onOpenChange: (value: boolean) => void;
  openDepsInstallModal: () => void;
};

export function SettingsSheet({ session, open, onOpenChange, openDepsInstallModal }: PropsType) {
  const { cells } = useCells();

  const title = cells.find((cell) => cell.type === 'title') as TitleCellType;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="pt-12">
        <SheetHeader>
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
          {session.language === 'typescript' && <TsconfigJson session={session} />}
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

function TsconfigJson({ session }: { session: SessionType }) {
  const { codeTheme } = useTheme();

  const [open, setOpen] = useState(false);

  return (
    <div>
      <CollapsibleContainer open={open} setOpen={setOpen} title="tsconfig.json">
        <div className="pt-1 pb-3 px-3">
          <CodeMirror
            value={JSON.stringify(session['tsconfig.json'], null, 2)}
            theme={codeTheme}
            extensions={[json()]}
            editable={false}
            basicSetup={{ lineNumbers: false, foldGutter: false }}
          />
        </div>
      </CollapsibleContainer>
      {open && (
        <p className="text-xs text-tertiary-foreground mt-1.5 text-right">
          Ability to customize coming soon.
        </p>
      )}
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
