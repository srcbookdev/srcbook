import React, { createContext, useContext } from 'react';
import { useRevalidator } from 'react-router-dom';
import { updateConfig as updateConfigServer } from '@/lib/server';
import type { SettingsType } from '@/types';

export type SettingsContextValue = SettingsType & {
  aiEnabled: boolean;
  updateConfig: (newConfig: Partial<SettingsType>) => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type ProviderPropsType = {
  config: SettingsType;
  children: React.ReactNode;
};

/**
 * An interface for working with our config.
 */
export function SettingsProvider({ config, children }: ProviderPropsType) {
  const revalidator = useRevalidator();

  const updateConfig = async (newConfig: Partial<SettingsType>) => {
    // Filter out null values and convert back to an object
    const changeSet = Object.fromEntries(
      Object.entries(newConfig).filter(([key, value]) => {
        if (key === 'codeiumApiKey') {
          return true;
        }
        return value !== null;
      }),
    );

    await updateConfigServer(changeSet);
    revalidator.revalidate();
  };

  const aiEnabled =
    (config.openaiKey && config.aiProvider === 'openai') ||
    (config.anthropicKey && config.aiProvider === 'anthropic') ||
    (config.aiProvider === 'custom' && !!config.aiBaseUrl) ||
    false;

  const context: SettingsContextValue = {
    ...config,
    aiEnabled,
    updateConfig,
  };

  return <SettingsContext.Provider value={context}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }

  return context;
}
