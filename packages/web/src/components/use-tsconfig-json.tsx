import React, { createContext, useCallback, useContext, useState } from 'react';
import { SessionType } from '@/types';
import { SessionChannel } from '@/clients/websocket';

function getValidationError(source: string) {
  try {
    JSON.parse(source);
    return null;
  } catch (e) {
    const err = e as Error;
    return err.message;
  }
}

export interface TsConfigContextValue {
  source: string;
  onChangeSource: (source: string) => void;
  validationError: string | null;
}

const TsConfigContext = createContext<TsConfigContextValue | undefined>(undefined);

type ProviderPropsType = {
  session: SessionType;
  channel: SessionChannel;
  children: React.ReactNode;
};

/**
 * An interface for working with tsconfig.json.
 */
export function TsConfigProvider({ channel, session, children }: ProviderPropsType) {
  const [source, setSource] = useState(session['tsconfig.json'] || '');
  const [validationError, setValidationError] = useState<string | null>(null);

  const onChangeSource = useCallback(
    (source: string) => {
      setSource(source);

      const error = getValidationError(source);
      setValidationError(error);

      if (error === null) {
        channel.push('tsconfig.json:update', {
          source,
        });
      }
    },
    [setSource, channel, setValidationError],
  );

  const context: TsConfigContextValue = {
    source,
    onChangeSource,
    validationError,
  };

  return <TsConfigContext.Provider value={context}>{children}</TsConfigContext.Provider>;
}

export function useTsconfigJson() {
  const context = useContext(TsConfigContext);

  if (!context) {
    throw new Error('useTsconfigJson must be used within a TsConfigProvider');
  }

  return context;
}
