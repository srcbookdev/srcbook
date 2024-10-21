import { BanIcon, XIcon } from 'lucide-react';
import { useHotkeys } from 'react-hotkeys-hook';

import { Button } from '@srcbook/components/src/components/ui/button';
import { cn } from '@/lib/utils.ts';
import { useLogs } from './use-logs';
import { useEffect, useRef } from 'react';

const maxHeightInPx = 320;

export default function BottomDrawer() {
  const { logs, clearLogs, open, togglePane, closePane } = useLogs();

  useHotkeys('mod+shift+y', () => {
    togglePane();
  });

  const scrollWrapperRef = useRef<HTMLDivElement | null>(null);

  // Scroll to the bottom of the logs panel when the user opens the panel fresh
  useEffect(() => {
    if (!scrollWrapperRef.current) {
      return;
    }
    scrollWrapperRef.current.scrollTop = scrollWrapperRef.current.scrollHeight;
  }, [open]);

  // Determine if the user has scrolled all the way to the bottom of the div
  const scrollPinnedToBottomRef = useRef(false);
  useEffect(() => {
    if (!scrollWrapperRef.current) {
      return;
    }
    const element = scrollWrapperRef.current;

    const onScroll = () => {
      scrollPinnedToBottomRef.current =
        element.scrollTop === element.scrollHeight - element.clientHeight;
    };

    element.addEventListener('scroll', onScroll);
    return () => element.removeEventListener('scroll', onScroll);
  }, []);

  // If the user has scrolled all the way to the bottom, then keep the bottom scroll pinned as new
  // logs come in.
  useEffect(() => {
    if (!scrollWrapperRef.current) {
      return;
    }

    if (scrollPinnedToBottomRef.current) {
      scrollWrapperRef.current.scrollTop = scrollWrapperRef.current.scrollHeight;
    }
  }, [logs]);

  return (
    <div
      className={cn(
        'flex flex-col w-full overflow-hidden transition-all duration-200 ease-in-out',
        open ? 'flex-grow' : 'flex-shrink-0 h-8',
      )}
      style={{ maxHeight: open ? `${maxHeightInPx}px` : '2rem' }}
    >
      <div className="flex-shrink-0 flex items-center justify-between border-t border-b h-8 px-1 w-full bg-muted">
        <span
          onClick={() => togglePane()}
          className="text-sm font-medium ml-2 select-none cursor-pointer"
        >
          Logs
        </span>

        <div className="flex items-center gap-1">
          {open && logs.length > 0 && (
            <Button
              size="sm"
              variant="icon"
              onClick={clearLogs}
              className="active:translate-y-0 w-6 px-0"
            >
              <BanIcon size={14} />
            </Button>
          )}
          <Button
            size="sm"
            variant="icon"
            onClick={() => closePane()}
            className="active:translate-y-0 w-6 px-0"
          >
            <XIcon size={16} />
          </Button>
        </div>
      </div>

      {open && (
        <div className="flex-grow overflow-auto p-2" ref={scrollWrapperRef}>
          <table className="w-full border-collapse text-xs">
            <tbody>
              {logs.map((log, index) => (
                <tr key={index}>
                  <td className="align-top whitespace-nowrap select-none pointer-events-none whitespace-nowrap w-0 pr-4">
                    <span className="font-mono text-tertiary-foreground/80">
                      {log.timestamp.toISOString()}
                    </span>
                  </td>
                  <td className="align-top whitespace-nowrap select-none pointer-events-none whitespace-nowrap w-0 pr-4">
                    <span className="font-mono text-tertiary-foreground">{log.source}</span>
                  </td>
                  <td className="align-top">
                    <pre
                      className={cn('font-mono cursor-text whitespace-pre-wrap', {
                        'text-red-300': log.type === 'stderr',
                        'text-tertiary-foreground': log.type === 'info',
                      })}
                    >
                      {log.message}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {logs.length === 0 && (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-tertiary-foreground">No logs</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
