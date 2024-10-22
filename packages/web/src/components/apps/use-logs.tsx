import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { AppChannel } from '@/clients/websocket';
import { DepsInstallLogPayloadType, PreviewLogPayloadType } from '@srcbook/shared';

export type LogMessage = {
  type: 'stderr' | 'stdout' | 'info';
  source: 'srcbook' | 'vite' | 'npm';
  timestamp: Date;
  message: string;
};

export interface LogsContextValue {
  logs: Array<LogMessage>;
  clearLogs: () => void;
  unreadLogsCount: number;
  panelIcon: 'default' | 'error';

  addLog: (type: LogMessage['type'], source: LogMessage['source'], message: string) => void;

  open: boolean;
  togglePane: () => void;
  closePane: () => void;
}

const LogsContext = createContext<LogsContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function LogsProvider({ channel, children }: ProviderPropsType) {
  const [logs, setLogs] = useState<Array<LogMessage>>([]);
  const [unreadLogsCount, setUnreadLogsCount] = useState(0);
  const [panelIcon, setPanelIcon] = useState<LogsContextValue['panelIcon']>('default');

  const [open, setOpen] = useState(false);

  function clearLogs() {
    setLogs([]);
    setPanelIcon('default');
    setUnreadLogsCount(0);
  }

  const addLog = useCallback(
    (type: LogMessage['type'], source: LogMessage['source'], message: LogMessage['message']) => {
      setLogs((logs) => [...logs, { type, message, source, timestamp: new Date() }]);
      if (type === 'stderr') {
        setPanelIcon('error');
      }
      setUnreadLogsCount((n) => n + 1);
    },
    [],
  );

  function togglePane() {
    setOpen((n) => !n);
    setPanelIcon('default');
    setUnreadLogsCount(0);
  }

  function closePane() {
    setOpen(false);
    setPanelIcon('default');
    setUnreadLogsCount(0);
  }

  // As the server generates logs, show them in the logs panel
  useEffect(() => {
    function onPreviewLog(payload: PreviewLogPayloadType) {
      for (const row of payload.log.data.split('\n')) {
        addLog(payload.log.type, 'vite', row);
      }
    }

    channel.on('preview:log', onPreviewLog);

    function onDepsInstallLog(payload: DepsInstallLogPayloadType) {
      for (const row of payload.log.data.split('\n')) {
        addLog(payload.log.type, 'npm', row);
      }
    }
    channel.on('deps:install:log', onDepsInstallLog);

    return () => {
      channel.off('preview:log', onPreviewLog);
      channel.off('deps:install:log', onDepsInstallLog);
    };
  }, [channel, addLog]);

  return (
    <LogsContext.Provider
      value={{
        logs,
        clearLogs,
        unreadLogsCount,
        panelIcon,

        addLog,

        open,
        togglePane,
        closePane,
      }}
    >
      {children}
    </LogsContext.Provider>
  );
}

export function useLogs(): LogsContextValue {
  return useContext(LogsContext) as LogsContextValue;
}
