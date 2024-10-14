import React, { createContext, useContext, useEffect, useState } from 'react';

import { AppChannel } from '@/clients/websocket';
import { PreviewStatusPayloadType } from '@srcbook/shared';

export type PreviewStatusType = 'booting' | 'connecting' | 'running' | 'stopped';

export interface PreviewContextValue {
  url: string | null;
  status: PreviewStatusType;
  stop: () => void;
  start: () => void;
}

const PreviewContext = createContext<PreviewContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function PreviewProvider({ channel, children }: ProviderPropsType) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatusType>('connecting');

  useEffect(() => {
    function onStatusUpdate(payload: PreviewStatusPayloadType) {
      setUrl(payload.url);
      setStatus(payload.status);
    }

    channel.on('preview:status', onStatusUpdate);

    return () => channel.off('preview:status', onStatusUpdate);
  }, [channel, setUrl, setStatus]);

  function start() {
    channel.push('preview:start', {});
  }

  function stop() {
    channel.push('preview:stop', {});
  }

  return (
    <PreviewContext.Provider value={{ url, status, stop, start }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  return useContext(PreviewContext) as PreviewContextValue;
}
