import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';

import { AppChannel } from '@/clients/websocket';
import { PreviewStatusPayloadType } from '@srcbook/shared';
import useEffectOnce from '@/components/use-effect-once';
import { usePackageJson } from './use-package-json';

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

  const { npmInstall, nodeModulesExists } = usePackageJson();

  useEffect(() => {
    function onStatusUpdate(payload: PreviewStatusPayloadType) {
      setUrl(payload.url);
      setStatus(payload.status);

      if (payload.status === 'stopped' && !payload.stoppedSuccessfully) {
        setLastStoppedError(payload.logs ?? '');
      } else {
        setLastStoppedError(null);
      }
    }

    channel.on('preview:status', onStatusUpdate);

    return () => channel.off('preview:status', onStatusUpdate);
  }, [channel, setUrl, setStatus]);

  async function start() {
    if (nodeModulesExists === false) {
      await npmInstall();
    }
    channel.push('preview:start', {});
  }

  const stop = useCallback(() => {
    channel.push('preview:stop', {});
  }, [channel]);

  // If the node_modules directory gets deleted, then stop the preview server
  useEffect(() => {
    if (nodeModulesExists !== false) {
      return;
    }
    stop();
  }, [nodeModulesExists, stop]);

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
