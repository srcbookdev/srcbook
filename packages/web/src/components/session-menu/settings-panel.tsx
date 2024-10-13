import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { TitleCellType, TsConfigUpdatedPayloadType } from '@srcbook/shared';
import { X, Info } from 'lucide-react';
import CodeMirror from '@uiw/react-codemirror';
import { json } from '@codemirror/lang-json';

import { cn } from '@/lib/utils';
import { useSettings } from '@/components/use-settings';
import CollapsibleContainer from '@/components/collapsible-container';
import useTheme from '@srcbook/components/src/components/use-theme';
import { SessionChannel } from '@/clients/websocket';
import { useTsconfigJson } from '@/components/use-tsconfig-json';
import { useCells } from '@srcbook/components/src/components/use-cell';

import type { SessionMenuPanelContentsProps } from '.';

type PropsType = Pick<SessionMenuPanelContentsProps, 'readOnly' | 'session' | 'channel'>;

export default function SessionMenuPanelSettings({ readOnly, session, channel }: PropsType) {
  const navigate = useNavigate();
  const { aiEnabled } = useSettings();
  const { cells } = useCells();

  const [showAiNudge, setShowAiNudge] = useState(!aiEnabled);

  const title = cells.find((cell) => cell.type === 'title') as TitleCellType;

  return (
    <>
      <h4 className="text-lg font-semibold leading-tight mb-4">Settings</h4>

      <div className="flex items-center justify-between gap-8 text-sm mb-5">
        <h5 className="font-medium max-w-72 truncate">{title.text}</h5>
        <p className="text-tertiary-foreground">
          {session.language === 'typescript' ? 'TypeScript' : 'JavaScript'}
        </p>
      </div>

      {showAiNudge && (
        <div className="relative flex flex-col px-3 py-3.5 border border-ai-border bg-ai text-ai-foreground rounded-sm text-sm">
          <button
            className="absolute top-2 right-2 cursor-pointer text-sb-purple-60"
            onClick={() => setShowAiNudge(false)}
          >
            <X size={16} />
          </button>
          <h2 className="font-bold">Use AI in notebook</h2>
          <p>
            AI features not enabled. To enable them, set up in{' '}
            <button
              className="font-medium underline cursor-pointer"
              onClick={() => navigate('/settings')}
            >
              {' '}
              global settings
            </button>
            .
          </p>
        </div>
      )}
      {/* TOOD: Add more settings or handle this in a better way */}
      {session.language === 'javascript' && (
        <p className="text-tertiary-foreground text-lg mt-5">No additional settings</p>
      )}
      {session.language === 'typescript' && (
        <div className="text-foreground mt-2 space-y-6">
          <TsconfigJson readOnly={readOnly} channel={channel} />
        </div>
      )}
    </>
  );
}

function TsconfigJson({
  readOnly,
  channel,
}: {
  readOnly?: boolean;
  channel: SessionChannel | null;
}) {
  const { codeTheme } = useTheme();
  const { source, onChangeSource, validationError } = useTsconfigJson();
  const [open, setOpen] = useState(true);
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
        onChangeOpen={setOpen}
        title="tsconfig.json"
        className={cn({ 'border-error': validationError !== null })}
      >
        <div className="pt-1 pb-3 px-3 relative">
          <CodeMirror
            readOnly={readOnly}
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
