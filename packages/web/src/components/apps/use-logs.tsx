import React, { createContext, useContext, useState } from 'react';

// import { AppChannel } from '@/clients/websocket';

export type LogsStatusType = 'booting' | 'connecting' | 'running' | 'stopped';

type LogMessage = {
  type: "error"; // TODO: add more types like "warning" or "problem"
  timestamp: Date;
  message: string;
};

export interface LogsContextValue {
  logs: Array<LogMessage>;
  clearLogs: () => void;
  addError: (message: string) => void;
  unreadLogsCount: number;
  clearUnreadCount: () => void;
}

const LogsContext = createContext<LogsContextValue | undefined>(undefined);

type ProviderPropsType = {
  // channel: AppChannel;
  children: React.ReactNode;
};

export function LogsProvider({ /* channel, */ children }: ProviderPropsType) {
  const [logs, setLogs] = useState<Array<LogMessage>>([]);
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
  }

  function addError(message: string) {
    setLogs(logs => [...logs, { type: "error", timestamp: new Date(), message }]);
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
