import React, { createContext, useContext } from 'react';
import { useRevalidator } from 'react-router-dom';
import { updateConfig } from '@/lib/server';
import type { SettingsType, AiConfigType } from '@/types';
import { OPENAI_CONFIG, ANTHROPIC_CONFIG } from '@/types';

export interface AiConfigContextValue {
  openaiKey?: string;
  anthropicKey?: string;
  aiConfig: AiConfigType;
  setAnthropicKey: (key: string) => void;
  setOpenaiKey: (key: string) => void;
  setProvider: (provider: 'openai' | 'anthropic') => void;
  aiEnabled: boolean;
}

const AiConfigContext = createContext<AiConfigContextValue | null>(null);

type ProviderPropsType = {
  config: SettingsType;
  children: React.ReactNode;
};

/**
 * An interface for working with our AI config.
 *
 * AI checks happen in different parts of the application so this context
 * allows to check that AI is enabled from anywhere.
 */
export function AiConfigProvider({ config, children }: ProviderPropsType) {
  const revalidator = useRevalidator();
  // Consider using useCallback here?
  const setAnthropicKey = async (anthropicKey: string) => {
    await updateConfig({ anthropicKey });
    revalidator.revalidate();
  };

  const setOpenAiKey = async (openAiKey: string) => {
    await updateConfig({ openaiKey: openAiKey });
    revalidator.revalidate();
  };

  const setProvider = async (provider: 'openai' | 'anthropic') => {
    const key = provider === 'openai' ? OPENAI_CONFIG : ANTHROPIC_CONFIG;
    await updateConfig({ aiConfig: key });
    revalidator.revalidate();
  };

  const aiEnabled =
    (config.openaiKey && config.aiConfig.provider === 'openai') ||
    (config.anthropicKey && config.aiConfig.provider === 'anthropic') ||
    false;

  const context: AiConfigContextValue = {
    openaiKey: config.openaiKey || '',
    anthropicKey: config.anthropicKey || '',
    aiConfig: config.aiConfig,
    setAnthropicKey,
    setOpenaiKey: setOpenAiKey,
    setProvider,
    aiEnabled,
  };

  return <AiConfigContext.Provider value={context}>{children}</AiConfigContext.Provider>;
}

export function useAiConfig() {
  const context = useContext(AiConfigContext);

  if (!context) {
    throw new Error('useAiConfig must be used within a AiConfigProvider');
  }

  return context;
}
