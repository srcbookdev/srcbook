import React, { createContext, useCallback, useContext, useState } from 'react';
import { OutputType } from '@srcbook/components/src/types';
import { AppChannel } from '@/clients/websocket';
import { DepsInstallLogPayloadType, DepsInstallStatusPayloadType } from '@srcbook/shared';
import { useLogs } from './use-logs';

type NpmInstallStatus = 'idle' | 'installing' | 'complete' | 'failed';

export interface PackageJsonContextValue {
  npmInstall: (packages?: string[]) => void;
  status: NpmInstallStatus;
  installing: boolean;
  failed: boolean;
  output: Array<OutputType>;
}

const PackageJsonContext = createContext<PackageJsonContextValue | undefined>(undefined);

type ProviderPropsType = {
  channel: AppChannel;
  children: React.ReactNode;
};

export function PackageJsonProvider({ channel, children }: ProviderPropsType) {
  const [status, setStatus] = useState<NpmInstallStatus>('idle');
  const [output, setOutput] = useState<Array<OutputType>>([]);

  const { addError } = useLogs();

  const npmInstall = useCallback(
    (packages?: Array<string>) => {
      // NOTE: caching of the log output is required here because socket events that call callback
      // functions in here hold on to old scope values
      let contents = '';

      const logCallback = ({ log }: DepsInstallLogPayloadType) => {
        setOutput((old) => [...old, log]);
        contents += log.data;
      };
      channel.on('deps:install:log', logCallback);

      const statusCallback = ({ status }: DepsInstallStatusPayloadType) => {
        channel.off('deps:install:log', logCallback);
        channel.off('deps:install:status', statusCallback);
        setStatus(status);

        if (status === 'failed') {
          addError({ type: 'npm_install_error', contents });
        }
      };
      channel.on('deps:install:status', statusCallback);

      setOutput([]);
      setStatus('installing');
      channel.push('deps:install', { packages });
    },
    [channel, addError],
  );

  const context: PackageJsonContextValue = {
    npmInstall,
    status,
    installing: status === 'installing',
    failed: status === 'failed',
    output,
  };

  return <PackageJsonContext.Provider value={context}>{children}</PackageJsonContext.Provider>;
}

export function usePackageJson() {
  const context = useContext(PackageJsonContext);

  if (!context) {
    throw new Error('usePackageJson must be used within a PackageJsonProvider');
  }

  return context;
}
