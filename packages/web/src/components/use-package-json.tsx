import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DepsValidateResponsePayloadType,
  PackageJsonCellType,
  PackageJsonCellUpdateAttrsType,
} from '@srcbook/shared';
import { SessionType, OutputType } from '@/types';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from './use-cell';
import { toast } from 'sonner';
import useEffectOnce from './use-effect-once';

function getValidationError(source: string) {
  try {
    JSON.parse(source);
    return null;
  } catch (e) {
    const err = e as Error;
    return err.message;
  }
}

export interface PackageJsonContextValue {
  source: string;
  onChangeSource: (source: string) => void;
  npmInstall: (packages?: string[]) => void;
  validationError: string | null;
  outdated: boolean;
  installing: boolean;
  output: OutputType[];
}

const PackageJsonContext = createContext<PackageJsonContextValue | undefined>(undefined);

type ProviderPropsType = {
  session: SessionType;
  channel: SessionChannel;
  children: React.ReactNode;
};

/**
 * An interface for working with package.json.
 *
 * This fulfills two purposes:
 *
 * 1. Abstract operations involving package.json
 * 2. Decouple the rest of the code from treating package.json
 *    as a cell since we want to move away from that.
 */
export function PackageJsonProvider({ channel, session, children }: ProviderPropsType) {
  const { cells, updateCell: updateCellOnClient, getOutput, clearOutput } = useCells();

  const cell = cells.find((cell) => cell.type === 'package.json') as PackageJsonCellType;

  // outdated means package.json is out of date nad needs to install deps.
  const [outdated, setOutdated] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  useEffectOnce(() => {
    channel.push('deps:validate', { sessionId: session.id });
  });

  const npmInstall = useCallback(
    (packages?: string[]) => {
      const error = getValidationError(cell.source);
      setValidationError(error);
      if (error === null) {
        updateCellOnClient({ ...cell, status: 'running' });
        clearOutput(cell.id);
        setOutdated(false);
        channel.push('deps:install', { sessionId: session.id, packages });
      }
    },
    [cell, channel, session.id, updateCellOnClient],
  );

  useEffect(() => {
    const callback = (payload: DepsValidateResponsePayloadType) => {
      const { packages } = payload;
      setOutdated(true);
      const msg = packages
        ? `Missing dependencies: ${packages.join(', ')}`
        : 'Packages need to be installed';
      toast.warning(msg, {
        duration: 10000,
        action: {
          label: 'Install',
          onClick: () => npmInstall(packages),
        },
      });
    };

    channel.on('deps:validate:response', callback);
    return () => channel.off('deps:validate:response', callback);
  }, [channel, npmInstall]);

  function updateCellOnServer(updates: PackageJsonCellUpdateAttrsType) {
    channel.push('cell:update', {
      sessionId: session.id,
      cellId: cell.id,
      updates,
    });
  }

  function onChangeSource(source: string) {
    const updates = { ...cell, source };
    updateCellOnClient(updates);

    const error = getValidationError(source);
    setValidationError(error);

    if (error === null) {
      updateCellOnServer(updates);
    }
  }

  const context: PackageJsonContextValue = {
    source: cell.source,
    onChangeSource,
    npmInstall,
    output: getOutput(cell.id),
    validationError,
    outdated,
    installing: cell.status === 'running',
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
