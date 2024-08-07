import React, { createContext, useContext } from 'react';
import { useRevalidator } from 'react-router-dom';
import { updateConfig as updateConfigServer } from '@/lib/server';
import type { SettingsType } from '@/types';
import { OPENAI_CONFIG, ANTHROPIC_CONFIG } from '@/types';

export type SettingsContextValue = SettingsType & {
  setAiProvider: (provider: 'openai' | 'anthropic') => void;
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
      Object.entries(newConfig).filter(([_, value]) => value !== null),
    );

    await updateConfigServer(changeSet);
    revalidator.revalidate();
  };

  const setAiProvider = async (provider: 'openai' | 'anthropic') => {
    const val = provider === 'openai' ? OPENAI_CONFIG : ANTHROPIC_CONFIG;
    await updateConfig({ aiConfig: val });
  };

  const aiEnabled =
    (config.openaiKey && config.aiConfig.provider === 'openai') ||
    (config.anthropicKey && config.aiConfig.provider === 'anthropic') ||
    false;

  const context: SettingsContextValue = {
    ...config,
    setAiProvider,
    aiEnabled,
    updateConfig,
  };

  return <SettingsContext.Provider value={context}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useAiConfig must be used within a AiConfigProvider');
  }

  return context;
}
