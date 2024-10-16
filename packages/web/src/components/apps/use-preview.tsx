import React, { createContext, useContext, useEffect, useState } from 'react';

import { AppChannel } from '@/clients/websocket';
import { PreviewStatusPayloadType } from '@srcbook/shared';
import useEffectOnce from '@/components/use-effect-once';

export type PreviewStatusType = 'booting' | 'connecting' | 'running' | 'stopped';

export interface PreviewContextValue {
  url: string | null;
  status: PreviewStatusType;
  stop: () => void;
  start: () => void;
  lastStoppedError: string | null;
}

const PreviewContext = createContext<PreviewContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function PreviewProvider({ channel, children }: ProviderPropsType) {
  const [url, setUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<PreviewStatusType>('connecting');
  const [lastStoppedError, setLastStoppedError] = useState<string | null>(null);

  useEffect(() => {
    function onStatusUpdate(payload: PreviewStatusPayloadType) {
      setUrl(payload.url);
      setStatus(payload.status);

      if (payload.status === "stopped" && !payload.ok) {
        setLastStoppedError(payload.contents ?? "")
      } else {
        setLastStoppedError(null);
      }
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

  // When the page initially loads, start the vite server
  useEffectOnce(() => {
    start();
  });

  return (
    <PreviewContext.Provider value={{ url, status, stop, start, lastStoppedError }}>
      {children}
    </PreviewContext.Provider>
  );
}

export function usePreview(): PreviewContextValue {
  return useContext(PreviewContext) as PreviewContextValue;
}
