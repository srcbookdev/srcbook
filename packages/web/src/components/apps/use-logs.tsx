import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { AppChannel } from '@/clients/websocket';
import { PreviewStatusPayloadType } from '@srcbook/shared';

export type LogMessage = {
  type: 'npm_install_error' | 'vite_error'; // TODO: add more types like "warning" or "problem"
  timestamp: Date;
  contents: string;
};

export interface LogsContextValue {
  logs: Array<LogMessage>;
  clearLogs: () => void;
  addError: (message: Omit<LogMessage, 'timestamp'>) => void;
  unreadLogsCount: number;

  open: boolean;
  togglePane: () => void;
}

const LogsContext = createContext<LogsContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function LogsProvider({ channel, children }: ProviderPropsType) {
  const [logs, setLogs] = useState<Array<LogMessage>>([]);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);

  const [open, setOpen] = useState(false);

  function clearLogs() {
    setLogs([]);
    setUnreadLogsCount(0);
  }

  const addError = useCallback((error: Omit<LogMessage, 'timestamp'>) => {
    setLogs((logs) => [{ ...error, timestamp: new Date() }, ...logs]);
    setUnreadLogsCount((n) => n + 1);
  }, []);

  function togglePane() {
    setOpen((n) => !n);
    setUnreadLogsCount(0);
  }

  // If vite crashes, then create an error log
  useEffect(() => {
    function onViteError(payload: PreviewStatusPayloadType) {
      if (payload.status !== 'stopped' || payload.stoppedSuccessfully) {
        return;
      }
      addError({ type: 'vite_error', contents: payload.logs ?? '' });
    }

    channel.on('preview:status', onViteError);

    return () => channel.off('preview:status', onViteError);
  }, [channel]);

  // TODO: if npm install fails, add an error log

  return (
    <LogsContext.Provider value={{ logs, clearLogs, addError, unreadLogsCount, open, togglePane }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs(): LogsContextValue {
  return useContext(LogsContext) as LogsContextValue;
}
