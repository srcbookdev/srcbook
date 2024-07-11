import { useCallback, useEffect, useState } from 'react';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import { CircleAlert, Play, ChevronRight, LoaderCircle } from 'lucide-react';
import {
  PackageJsonCellType,
  DepsValidateResponsePayloadType,
  PackageJsonCellUpdateAttrsType,
} from '@srcbook/shared';
import { cn } from '@/lib/utils';
import { SessionType } from '@/types';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import InstallPackageModal from '@/components/install-package-modal';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from '@/components/use-cell';
import { toast } from 'sonner';
import { CellOutput } from '@/components/cell-output';
import useTheme from '@/components/use-theme';
import { useHotkeys } from 'react-hotkeys-hook';

export default function PackageJsonCell(props: {
  cell: PackageJsonCellType;
  channel: SessionChannel;
  session: SessionType;
  onUpdateCell: (
    cell: PackageJsonCellType,
    attrs: PackageJsonCellUpdateAttrsType,
    getValidationError?: (cell: PackageJsonCellType) => string | null,
  ) => Promise<string | null>;
}) {
  const { cell, channel, session, onUpdateCell } = props;

  const [open, setOpen] = useState(false);
  const [installModalOpen, setInstallModalOpen] = useState(false);
  const [showStdio, setShowStdio] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useHotkeys('meta+i', () => {
    if (!installModalOpen) {
      setInstallModalOpen(true);
    }
  });

  const { updateCell, clearOutput } = useCells();
  const { codeTheme } = useTheme();

  const npmInstall = useCallback(
    (packages?: Array<string>) => {
      if (getValidationError(cell)) return;
      setShowStdio(true);
      setOpen(true);
      // Here we use the client-only updateCell function. The server will know its running from the 'deps:install'.
      updateCell({ ...cell, status: 'running' });
      clearOutput(cell.id);

      channel.push('deps:install', {
        sessionId: session.id,
        packages: packages,
      });
    },
    [cell, clearOutput, channel, session, updateCell],
  );

  // Useeffect to handle single package install events
  useEffect(() => {
    const callback = (payload: DepsValidateResponsePayloadType) => {
      const { packages } = payload;
      const msg = packages
        ? `Missing dependencies: ${packages.join(', ')}`
        : 'Packages need to be installed';
      toast.warning(msg, {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => npmInstall(packages),
        },
      });
    };
    channel.on('deps:validate:response', callback);
    return () => channel.off('deps:validate:response', callback);
  }, [channel, npmInstall]);

  const onOpenChange = (state: boolean) => {
    // Clear the output when we collapse the package.json cell.
    if (!state) {
      setShowStdio(false);
    }
    setOpen(state);
  };

  function getValidationError(cell: PackageJsonCellType) {
    try {
      JSON.parse(cell.source);
      return null;
    } catch (e) {
      const err = e as Error;
      return err.message;
    }
  }
  async function onChangeSource(source: string) {
    const error = await onUpdateCell(cell, { source }, getValidationError);
    setError(error);
  }

  function evaluateModEnter() {
    npmInstall();
    return true;
  }

  return (
    <div id={`cell-${props.cell.id}`} className="relative">
      {error && open && (
        <div className="flex items-center gap-2 absolute bottom-1 right-1 px-2.5 py-2 text-sb-red-80 bg-sb-red-30 rounded-sm">
          <CircleAlert size={16} />
          <p className="text-xs">{error}</p>
        </div>
      )}
      <InstallPackageModal
        channel={channel}
        session={session}
        open={installModalOpen}
        setOpen={setInstallModalOpen}
      />
      <Collapsible open={open} onOpenChange={onOpenChange}>
        <div
          className={
            open
              ? cn(
                  'border rounded-md group ring-1 ring-ring gborder-ring',
                  cell.status === 'running' && 'ring-1 ring-run-ring border-run-ring',
                  error && 'ring-sb-red-30 border-sb-red-30',
                )
              : ''
          }
        >
          <div className="flex w-full justify-between items-start">
            <CollapsibleTrigger className="flex gap-3" asChild>
              <div>
                <Button
                  variant="secondary"
                  className={cn(
                    'font-mono font-semibold active:translate-y-0 flex items-center gap-2 pr-1 hover:bg-transparent',
                    open && 'border-transparent',
                    error && !open && 'border-sb-red-30 ring-1 ring-sb-red-30',
                  )}
                  size="lg"
                >
                  <p>package.json</p>
                  <ChevronRight
                    size="24"
                    style={{
                      transform: open ? `rotate(90deg)` : 'none',
                      transition: 'transform 0.2s',
                      color: 'hsl(var(--tertiary-foreground))',
                    }}
                  />
                </Button>
              </div>
            </CollapsibleTrigger>

            {open && (
              <div className="flex items-center gap-2 p-1">
                <Button variant="secondary" onClick={() => setInstallModalOpen(true)}>
                  Install package
                </Button>
                {cell.status === 'running' ? (
                  <Button variant="run" size="default-with-icon" disabled>
                    <LoaderCircle size={16} className="animate-spin" />
                    Installing
                  </Button>
                ) : (
                  <Button
                    size="default-with-icon"
                    onClick={() => npmInstall()}
                    disabled={cell.status !== 'idle' || !!error}
                    className="font-mono"
                  >
                    <Play size={16} />
                    Run
                  </Button>
                )}
              </div>
            )}
          </div>
          <CollapsibleContent className="pt-2">
            <CodeMirror
              value={cell.source.trim()}
              theme={codeTheme}
              extensions={[
                json(),
                Prec.highest(keymap.of([{ key: 'Mod-Enter', run: evaluateModEnter }])),
              ]}
              onChange={onChangeSource}
              basicSetup={{ lineNumbers: true, foldGutter: false }}
            />

            <CellOutput cell={cell} show={showStdio} setShow={setShowStdio} />
          </CollapsibleContent>
        </div>
      </Collapsible>
    </div>
  );
}
