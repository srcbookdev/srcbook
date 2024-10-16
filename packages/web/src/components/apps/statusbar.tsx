import { useState } from "react";
import { BugIcon, TrashIcon } from "lucide-react";
import { useHotkeys } from 'react-hotkeys-hook';

import { Button } from "@srcbook/components/src/components/ui/button";
import { cn } from '@/lib/utils.ts';
import { useLogs } from "./use-logs";

export default function Statusbar() {
  const { logs, clearLogs, unreadLogsCount, clearUnreadCount } = useLogs();
  const [open, setOpen] = useState(false);

  useHotkeys('mod+shift+y', () => {
    setOpen(n => !n);
  });

  return (
    <>
      <div className="flex items-center justify-between h-8 border-t border-t-border px-2">
        <Button
          size="sm"
          variant={open ? "default" : "icon"}
          onClick={() => {
            setOpen(n => !n);
            clearUnreadCount();
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
        className={cn("flex flex-col-reverse px-2 overflow-auto cursor-text", "h-0", { "h-[320px] py-2": open })}
        style={{ transition: "all 100ms ease-in-out" }}
      >
        {logs.map(log => (
          // FIXME: add a better explicit key, maybe a uuid in each log message?
          <pre
            className={cn("font-mono", { "text-red-500": log.type === "error" })}
            key={`${log.timestamp.toISOString()},${log.type},${log.message}`}
          >
            <span className="text-tertiary-foreground select-none pointer-events-none">{log.timestamp.toISOString()} </span>
            {log.message}
          </pre>
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
