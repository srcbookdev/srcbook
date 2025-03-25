import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRevalidator } from 'react-router-dom';
import { updateConfig as updateConfigServer } from '@/lib/server';
import type { SettingsType } from '@/types';

export type OpenRouterModel = {
  id: string;
  name: string;
  provider: string;
  description?: string;
  pricing?: Record<string, number>;
  context_length?: number;
};

export type GroupedOpenRouterModels = Record<string, OpenRouterModel[]>;

export type SettingsContextValue = SettingsType & {
  aiEnabled: boolean;
  updateConfig: (newConfig: Partial<SettingsType>) => Promise<void>;
  openRouterModels: GroupedOpenRouterModels;
  isLoadingOpenRouterModels: boolean;
  refreshOpenRouterModels: () => Promise<void>;
};

const SettingsContext = createContext<SettingsContextValue | null>(null);

type ProviderPropsType = {
  config: SettingsType;
  children: React.ReactNode;
};

async function fetchOpenRouterModels(): Promise<OpenRouterModel[]> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models');
    if (!response.ok) {
      throw new Error('Failed to fetch models');
    }
    const data = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    return [];
  }
}

function groupModelsByProvider(models: OpenRouterModel[]): GroupedOpenRouterModels {
  return models.reduce((grouped, model) => {
    const provider = model.provider || 'Unknown';
    if (!grouped[provider]) {
      grouped[provider] = [];
    }
    grouped[provider].push(model);
    return grouped;
  }, {} as GroupedOpenRouterModels);
}

/**
 * An interface for working with our config.
 */
export function SettingsProvider({ config, children }: ProviderPropsType) {
  const revalidator = useRevalidator();
  const [openRouterModels, setOpenRouterModels] = useState<GroupedOpenRouterModels>({});
  const [isLoadingOpenRouterModels, setIsLoadingOpenRouterModels] = useState(false);

  const updateConfig = async (newConfig: Partial<SettingsType>) => {
    // Filter out null values and convert back to an object
    const changeSet = Object.fromEntries(
      Object.entries(newConfig).filter(([_, value]) => value !== null),
    );

    await updateConfigServer(changeSet);
    revalidator.revalidate();
  };

  const refreshOpenRouterModels = async () => {
    setIsLoadingOpenRouterModels(true);
    try {
      const models = await fetchOpenRouterModels();
      const grouped = groupModelsByProvider(models);
      setOpenRouterModels(grouped);
    } finally {
      setIsLoadingOpenRouterModels(false);
    }
  };

  useEffect(() => {
    if (config.aiProvider === 'openrouter') {
      refreshOpenRouterModels();
    }
  }, [config.aiProvider]);

  const aiEnabled =
    (config.openaiKey && config.aiProvider === 'openai') ||
    (config.anthropicKey && config.aiProvider === 'anthropic') ||
    (config.xaiKey && config.aiProvider === 'Xai') ||
    (config.geminiKey && config.aiProvider === 'Gemini') ||
    (config.openrouterKey && config.aiProvider === 'openrouter') ||
    (config.aiProvider === 'custom' && !!config.aiBaseUrl) ||
    false;

  const context: SettingsContextValue = {
    ...config,
    aiEnabled,
    updateConfig,
    openRouterModels,
    isLoadingOpenRouterModels,
    refreshOpenRouterModels,
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
