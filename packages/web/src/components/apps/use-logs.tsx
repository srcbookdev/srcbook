import React, { createContext, useContext, useState } from 'react';

// import { AppChannel } from '@/clients/websocket';

export type LogsStatusType = 'booting' | 'connecting' | 'running' | 'stopped';

export type ErrorMessage = {
  type: "npm_install_error" | "vite_error"; // TODO: add more types like "warning" or "problem"
  timestamp: Date;
  contents: string;
};

export interface LogsContextValue {
  logs: Array<ErrorMessage>;
  clearLogs: () => void;
  addError: (message: Omit<ErrorMessage, 'timestamp'>) => void;
  unreadLogsCount: number;
  clearUnreadCount: () => void;
}

const LogsContext = createContext<LogsContextValue | undefined>(undefined);

type ProviderPropsType = {
  // channel: AppChannel;
  children: React.ReactNode;
};

export function LogsProvider({ /* channel, */ children }: ProviderPropsType) {
  const [logs, setLogs] = useState<Array<ErrorMessage>>([]);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);

  // TODO: get error logs from vite via the `channel` and auto log them

  // useEffect(() => {
  //   function onStatusUpdate(payload: LogsStatusPayloadType) {
  //     setUrl(payload.url);
  //     setStatus(payload.status);
  //   }

  //   channel.on('logs:status', onStatusUpdate);

  //   return () => channel.off('logs:status', onStatusUpdate);
  // }, [channel, setUrl, setStatus]);

  function clearLogs() {
    setLogs([]);
    setUnreadLogsCount(0);
  }

  function addError(error: Omit<ErrorMessage, 'timestamp'>) {
    setLogs(logs => [{ ...error, timestamp: new Date() }, ...logs]);
    setUnreadLogsCount(n => n + 1);
  }

  function clearUnreadCount() {
    setUnreadLogsCount(0);
  }

  return (
    <LogsContext.Provider value={{ logs, clearLogs, addError, unreadLogsCount, clearUnreadCount }}>
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs(): LogsContextValue {
  return useContext(LogsContext) as LogsContextValue;
}
