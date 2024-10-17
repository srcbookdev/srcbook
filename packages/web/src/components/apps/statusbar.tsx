import { useState } from 'react';
import { BugIcon, ChevronDownIcon, ChevronRightIcon, TrashIcon } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Button } from '@srcbook/components/src/components/ui/button';
import { cn } from '@/lib/utils.ts';
import { LogMessage, useLogs } from './use-logs';

function getLabelForError(error: LogMessage) {
  switch (error.type) {
    case 'vite_error':
      return 'Error running vite preview server';
    case 'npm_install_error':
      return 'Error running npm install';
  }
}

type CollapsibleErrorMessageProps = {
  error: LogMessage;
};

function CollapsibleErrorMessage({ error }: CollapsibleErrorMessageProps) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        className={cn(
          'flex items-center gap-2 font-mono p-2 first:border-t first:border-t-border focus-visible:outline-none ring-inset focus-visible:ring-1 focus-visible:ring-ring',
          {
            'border-b border-b-border': !open,
          },
        )}
        onClick={() => setOpen((n) => !n)}
      >
        {open ? <ChevronDownIcon size={16} /> : <ChevronRightIcon size={16} />}
        <span className="text-tertiary-foreground select-none pointer-events-none">
          {error.timestamp.toISOString()}{' '}
        </span>
        {getLabelForError(error)}
      </button>
      {open ? (
        <pre className={cn('text-sm p-2', { 'ml-[15px] pl-4 mb-4 border-l': open })}>
          {error.contents}
        </pre>
      ) : null}
    </>
  );
}

export default function Statusbar() {
  const { logs, clearLogs, unreadLogsCount, open, togglePane } = useLogs();

  useHotkeys('mod+shift+y', () => {
    togglePane();
  });

  return (
    <>
      <div className="flex items-center justify-between h-8 border-t border-t-border px-2">
        <Button
          size="sm"
          variant={open ? 'default' : 'icon'}
          onClick={() => {
            togglePane();
          }}
          className="active:translate-y-0"
        >
          <div className="flex items-center gap-2">
            <BugIcon size={14} />
            Errors
            {!open && unreadLogsCount > 0 ? (
              <div className="w-4 h-4 text-white bg-red-500 rounded-[8px]">{unreadLogsCount}</div>
            ) : null}
          </div>
        </Button>
        {open && logs.length > 0 ? (
          <Button
            size="sm"
            variant="icon"
            onClick={clearLogs}
            className="active:translate-y-0 w-6 px-0"
          >
            <TrashIcon size={16} />
          </Button>
        ) : null}
      </div>

      <div
        className={cn('flex flex-col overflow-auto cursor-text', 'h-0', { 'h-[320px]': open })}
        style={{ transition: 'all 100ms ease-in-out' }}
      >
        {logs.map((error) => (
          // FIXME: add a better explicit key, maybe a uuid in each log message?
          <CollapsibleErrorMessage key={error.timestamp.toISOString()} error={error} />
        ))}

        {logs.length === 0 ? (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-tertiary-foreground">No errors</span>
          </div>
        ) : null}
      </div>
    </>
  );
}
