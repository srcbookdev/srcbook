import { useState } from 'react';
import { OutputType } from '@/types';
import {
  Info,
  LoaderCircle,
  Play,
  PanelBottomOpen,
  PanelBottomClose,
  CopyIcon,
  CheckIcon,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import CollapsibleContainer from '@/components/collapsible-container';
import CodeMirror, { keymap, Prec } from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';
import useTheme from '@srcbook/components/src/components/use-theme';
import { Button } from '@srcbook/components/src/components/ui/button';
import { usePackageJson } from '@/components/use-package-json';

import { SessionMenuPanelContentsProps } from '.';

type PropsType = Pick<SessionMenuPanelContentsProps, 'readOnly' | 'openDepsInstallModal'>;

export default function SessionMenuPanelPackages({ readOnly, openDepsInstallModal }: PropsType) {
  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-4">Dependencies</h4>
      <PackageJson readOnly={readOnly} openDepsInstallModal={openDepsInstallModal} />
    </>
  );
}

function PackageJson({
  readOnly,
  openDepsInstallModal,
}: {
  readOnly: boolean;
  openDepsInstallModal: (() => void) | null;
}) {
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
        open={open}
        onChangeOpen={setOpen}
        title="package.json"
        className={cn({ 'border-run': installing })}
      >
        <div className="pt-1 pb-3 px-3">
          <CodeMirror
            readOnly={readOnly}
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
        {failed && <Error error="Failed to install dependencies" />}
        {hasOutput && <OutputContainer output={output} />}
      </CollapsibleContainer>
      {open && openDepsInstallModal && (
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
    setTimeout(() => setCopyIcon('copy'), 1500);
  }

  return (
    <div className="divide-y border-border font-mono text-sm">
      <div className="border-t border-border px-3 py-2 flex items-center justify-between bg-muted text-medium text-tertiary-foreground">
        <h5 className="leading-none">Logs</h5>
        <div className="flex items-center gap-6">
          <button
            className="hover:text-secondary-hover"
            onClick={onCopy}
            disabled={copyIcon === 'copied'}
          >
            {copyIcon === 'copy' ? <CopyIcon size={18} /> : <CheckIcon size={18} />}
          </button>
          <button className="hover:text-secondary-hover" onClick={() => setShow(!show)}>
            {show ? <PanelBottomOpen size={18} /> : <PanelBottomClose size={18} />}
          </button>
        </div>
      </div>
      {show && <div className="p-3 overflow-scroll whitespace-pre text-[13px]">{output}</div>}
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
