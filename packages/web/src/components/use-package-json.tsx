import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  DepsValidateResponsePayloadType,
  PackageJsonCellType,
  PackageJsonCellUpdateAttrsType,
} from '@srcbook/shared';
import { OutputType } from '@srcbook/components/src/types';
import { SessionChannel } from '@/clients/websocket';
import { useCells } from '@srcbook/components/src/components/use-cell';
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
  outdated: boolean | string[];
  installing: boolean;
  failed: boolean;
  output: OutputType[];
}

const PackageJsonContext = createContext<PackageJsonContextValue | undefined>(undefined);

type ProviderPropsType = {
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
export function PackageJsonProvider({ channel, children }: ProviderPropsType) {
  const { cells, updateCell: updateCellOnClient, getOutput, clearOutput } = useCells();

  const cell = cells.find((cell) => cell.type === 'package.json') as PackageJsonCellType;

  // outdated means package.json is out of date and needs to install deps.
  //
  // If outdated is an array, it means the specific entries in the array are
  // packages that are not yet listed in package.json's dependencies. In this
  // case, we must ensure we install these packages and save them to package.json.
  //
  // If outdated is true, it means there are packages in package.json that need
  // to be installed. This can happen if user created or imported a srcbook and
  // forgot to run `npm install` or when AI adds packages to package.json.
  //
  const [outdated, setOutdated] = useState<boolean | string[]>(false);

  const [validationError, setValidationError] = useState<string | null>(null);

  useEffectOnce(() => {
    channel.push('deps:validate', {});
  });

  const npmInstall = useCallback(
    (packages?: string[]) => {
      const error = getValidationError(cell.source);
      setValidationError(error);
      if (error === null) {
        updateCellOnClient({ ...cell, status: 'running' });
        clearOutput(cell.id);
        setOutdated(false);
        channel.push('deps:install', { packages });
      }
    },
    [cell, channel, updateCellOnClient, clearOutput],
  );

  useEffect(() => {
    const callback = (response: DepsValidateResponsePayloadType) => {
      // If we receive a response at all, it means there are outdated packages.
      setOutdated(response.packages ?? true);
    };

    channel.on('deps:validate:response', callback);
    return () => channel.off('deps:validate:response', callback);
  }, [channel, npmInstall]);

  function updateCellOnServer(updates: PackageJsonCellUpdateAttrsType) {
    channel.push('cell:update', {
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
    failed: cell.status === 'failed',
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
